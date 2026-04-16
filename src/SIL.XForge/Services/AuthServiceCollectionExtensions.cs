#nullable disable warnings
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Duende.IdentityModel;
using idunno.Authentication.Basic;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using SIL.XForge;
using SIL.XForge.Configuration;
using SIL.XForge.Services;

namespace Microsoft.Extensions.DependencyInjection;

public static class AuthServiceCollectionExtensions
{
    public static IServiceCollection AddXFAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var authOptions = configuration.GetOptions<AuthOptions>();
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                if (authOptions.UseLocalAuth)
                {
                    // In local dev mode, validate tokens via JWKS discovery from the local stub server.
                    // The stub runs on http (not https) so we disable the https requirement.
                    options.Authority = $"http://{authOptions.Domain}/";
                    options.RequireHttpsMetadata = false;
                    options.Audience = authOptions.Audience;
                }
                else
                {
                    options.Authority = $"https://{authOptions.Domain}/";
                    options.Audience = authOptions.Audience;
                }

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        ExtractSignalRToken(context, authOptions);
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        ValidateScope(context, authOptions);
                        return Task.CompletedTask;
                    },
                };
            })
            .AddBasic(options =>
            {
                options.Events = new BasicAuthenticationEvents
                {
                    OnValidateCredentials = context =>
                    {
                        var authService = context.HttpContext.RequestServices.GetService<IAuthService>();
                        if (authService.ValidateWebhookCredentials(context.Username, context.Password))
                        {
                            Claim[] claims =
                            [
                                new Claim(
                                    ClaimTypes.NameIdentifier,
                                    context.Username,
                                    ClaimValueTypes.String,
                                    context.Options.ClaimsIssuer
                                ),
                                new Claim(
                                    ClaimTypes.Name,
                                    context.Username,
                                    ClaimValueTypes.String,
                                    context.Options.ClaimsIssuer
                                ),
                            ];

                            context.Principal = new ClaimsPrincipal(new ClaimsIdentity(claims, context.Scheme.Name));
                            context.Success();
                        }
                        return Task.CompletedTask;
                    },
                };
            });

        return services;
    }

    private static void ExtractSignalRToken(MessageReceivedContext context, AuthOptions authOptions)
    {
        // If the request is for our SignalR hub, extract the token from the query string
        string? accessToken = context.Request.Query["access_token"];
        if (
            !string.IsNullOrEmpty(accessToken)
            && (
                context.HttpContext.Request.Path.StartsWithSegments($"/{UrlConstants.ProjectNotifications}")
                || context.HttpContext.Request.Path.StartsWithSegments($"/{UrlConstants.DraftNotifications}")
            )
        )
        {
            context.Token = accessToken;
        }
    }

    private static void ValidateScope(TokenValidatedContext context, AuthOptions authOptions)
    {
        string scopeClaim = context.Principal.FindFirst(c => c.Type == JwtClaimTypes.Scope)?.Value;
        var scopes = new HashSet<string>(scopeClaim?.Split(' ') ?? Enumerable.Empty<string>());
        if (!scopes.Contains(authOptions.Scope))
            context.Fail("A required scope has not been granted.");
    }
}

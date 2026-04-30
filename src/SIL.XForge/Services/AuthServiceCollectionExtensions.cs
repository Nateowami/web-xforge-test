#nullable disable warnings
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Duende.IdentityModel;
using idunno.Authentication.Basic;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
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
                    // In local dev mode, validate tokens directly without OIDC discovery.
                    // The signing key (public key PEM from Auth:LocalDevPublicKeyPem) is injected
                    // via PostConfigure below, after the DI container is built.
                    // Using a fixed key pair avoids any timing dependency on the stub server being
                    // available when the main app starts.
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateAudience = true,
                        ValidAudience = authOptions.Audience,
                        ValidateIssuer = true,
                        ValidIssuer = $"http://{authOptions.Domain}/",
                        ValidateIssuerSigningKey = true,
                    };
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

        if (authOptions.UseLocalAuth)
        {
            // Inject the dev stub's public key into the JWT bearer options once the DI container is
            // built so that configuration is fully available.  The public key is the counterpart of
            // the private key stored in dev-stubs/appsettings.json and is never used in production.
            services
                .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
                .PostConfigure(
                    (JwtBearerOptions jwtOptions) =>
                    {
                        string publicKeyPem =
                            configuration.GetValue<string>("Auth:LocalDevPublicKeyPem") ?? string.Empty;
                        if (!string.IsNullOrWhiteSpace(publicKeyPem))
                        {
                            // RSA instance is intentionally not disposed here – it must remain alive for
                            // the lifetime of the application since RsaSecurityKey holds a reference to it.
                            var rsa = RSA.Create();
                            rsa.ImportFromPem(publicKeyPem);
                            jwtOptions.TokenValidationParameters.IssuerSigningKey = new RsaSecurityKey(rsa)
                            {
                                KeyId = "dev-stub-key",
                            };
                        }
                    }
                );
        }

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

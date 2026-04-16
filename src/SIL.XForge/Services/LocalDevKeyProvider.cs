using System;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;

namespace SIL.XForge.Services;

/// <summary>
/// Provides a locally generated RSA signing key for development-mode JWT issuance and validation.
/// This key is generated once at startup and is only used when <see cref="Configuration.AuthOptions.UseLocalAuth"/>
/// is true.
/// </summary>
public class LocalDevKeyProvider : IDisposable
{
    private readonly RSA _rsa = RSA.Create(2048);

    /// <summary>
    /// Gets the RSA security key used for signing and validating JWTs in local dev mode.
    /// </summary>
    public RsaSecurityKey SecurityKey => new RsaSecurityKey(_rsa) { KeyId = "local-dev-key" };

    /// <summary>
    /// Returns the RSA public key as a PEM-encoded string, for use by the RealtimeServer.
    /// </summary>
    public string GetPublicKeyPem()
    {
        byte[] pubKeyBytes = _rsa.ExportSubjectPublicKeyInfo();
        string base64 = Convert.ToBase64String(pubKeyBytes, Base64FormattingOptions.InsertLineBreaks);
        return $"-----BEGIN PUBLIC KEY-----\n{base64}\n-----END PUBLIC KEY-----";
    }

    /// <summary>
    /// Returns a JWKS JSON document containing the public key, suitable for serving at
    /// <c>/.well-known/jwks.json</c>.
    /// </summary>
    public string GetJwksJson()
    {
        var jsonWebKey = JsonWebKeyConverter.ConvertFromRSASecurityKey(SecurityKey);
        jsonWebKey.Alg = SecurityAlgorithms.RsaSha256;
        jsonWebKey.Use = JsonWebKeyUseNames.Sig;

        var keyObject = new JObject(
            new JProperty("kty", jsonWebKey.Kty),
            new JProperty("kid", jsonWebKey.Kid),
            new JProperty("use", jsonWebKey.Use),
            new JProperty("alg", jsonWebKey.Alg),
            new JProperty("n", jsonWebKey.N),
            new JProperty("e", jsonWebKey.E)
        );

        return new JObject(new JProperty("keys", new JArray(keyObject))).ToString();
    }

    public void Dispose() => _rsa.Dispose();
}

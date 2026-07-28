using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.Extensions.Hosting;
using NUnit.Framework;

namespace SIL.XForge.Scripture;

[TestFixture]
public class HostEnvironmentsTests
{
    [TestCase(null)]
    [TestCase("")]
    [TestCase("   ")]
    public void Resolve_NothingSpecified_Development(string? requested) =>
        // SUT
        Assert.That(HostEnvironments.Resolve(requested), Is.EqualTo(Environments.Development));

    [TestCase("Development", ExpectedResult = "Development")]
    [TestCase("Testing", ExpectedResult = "Testing")]
    [TestCase("Staging", ExpectedResult = "Staging")]
    [TestCase("Production", ExpectedResult = "Production")]
    // The environment name is compared case-sensitively in places, and is part of the settings file
    // names, so a supported environment specified in another case is corrected rather than passed on.
    [TestCase("staging", ExpectedResult = "Staging")]
    [TestCase(" PRODUCTION ", ExpectedResult = "Production")]
    public string Resolve_SupportedEnvironment_CanonicalName(string requested) =>
        // SUT
        HostEnvironments.Resolve(requested);

    [TestCase("QA")]
    [TestCase("Live")]
    [TestCase("Prod")]
    public void Resolve_UnsupportedEnvironment_Throws(string requested)
    {
        // SUT
        var exception = Assert.Throws<InvalidOperationException>(() => HostEnvironments.Resolve(requested));
        Assert.That(exception?.Message, Does.Contain(requested));
    }

    [Test]
    public void Resolve_NoEnvironmentFile_Development()
    {
        using var env = new TestEnvironment();

        // SUT
        Assert.That(HostEnvironments.Resolve([], env.Path), Is.EqualTo(Environments.Development));
    }

    [Test]
    public void Resolve_EnvironmentFile_EnvironmentFromFile()
    {
        using var env = new TestEnvironment();
        env.WriteEnvironmentFile(Environments.Production);

        // SUT
        Assert.That(HostEnvironments.Resolve([], env.Path), Is.EqualTo(Environments.Production));
    }

    [Test]
    public void Resolve_EnvironmentFileAndCommandLine_CommandLineWins()
    {
        using var env = new TestEnvironment();
        env.WriteEnvironmentFile(Environments.Production);

        // SUT
        Assert.That(
            HostEnvironments.Resolve(["--environment", Environments.Staging], env.Path),
            Is.EqualTo(Environments.Staging)
        );
    }

    [Test]
    public void Resolve_EnvironmentFileAndEnvironmentVariable_EnvironmentVariableWins()
    {
        using var env = new TestEnvironment();
        env.WriteEnvironmentFile(Environments.Production);
        env.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", Environments.Development);

        // SUT
        Assert.That(HostEnvironments.Resolve([], env.Path), Is.EqualTo(Environments.Development));
    }

    [Test]
    public void Resolve_UnsupportedEnvironmentVariable_Throws()
    {
        using var env = new TestEnvironment();
        env.SetEnvironmentVariable("DOTNET_ENVIRONMENT", "QA");

        // SUT
        Assert.Throws<InvalidOperationException>(() => HostEnvironments.Resolve([], env.Path));
    }

    private sealed class TestEnvironment : IDisposable
    {
        private readonly List<(string Name, string? Value)> _environmentVariables = [];

        public TestEnvironment() => Directory.CreateDirectory(Path);

        public string Path { get; } = System.IO.Path.Join(System.IO.Path.GetTempPath(), Guid.NewGuid().ToString());

        public void WriteEnvironmentFile(string environment) =>
            File.WriteAllText(
                System.IO.Path.Join(Path, HostEnvironments.EnvironmentFileName),
                $"{{ \"environment\": \"{environment}\" }}"
            );

        public void SetEnvironmentVariable(string name, string value)
        {
            _environmentVariables.Add((name, Environment.GetEnvironmentVariable(name)));
            Environment.SetEnvironmentVariable(name, value);
        }

        public void Dispose()
        {
            foreach ((string name, string? value) in _environmentVariables)
                Environment.SetEnvironmentVariable(name, value);
            Directory.Delete(Path, recursive: true);
        }
    }
}

using System;
using System.Linq;
using System.Reflection;
using System.Threading;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Hangfire.Storage;
using NSubstitute;
using NUnit.Framework;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// Tests for <see cref="MutexAttribute"/> key generation logic and configuration on background job interfaces.
/// Includes regression tests for the bug where <c>string.Format(..., job.Args)</c> produced
/// <c>"System.Object[]"</c> instead of expanding arguments correctly, because <c>job.Args</c> is
/// <c>IReadOnlyList&lt;object&gt;</c> and the C# compiler chose the single-object overload.
/// </summary>
[TestFixture]
public class MutexAttributeTests
{
    [Test]
    public void GetKeyFormat_NoResource_UsesMethodName()
    {
        // Verify that when no resource is specified, the method name is used as the key
        var method = typeof(ITestRunner).GetMethod("SomeMethod")!;
        var job = new Job(typeof(ITestRunner), method, "arg1", "arg2");

        var attr = new MutexAttribute();
        // Access via reflection since GetKeyFormat is private
        var keyFormat = InvokeGetKeyFormat(attr, job);

        Assert.That(keyFormat, Is.EqualTo("SomeMethod"));
    }

    [Test]
    public void GetKeyFormat_WithResourceAndNoPlaceholders_UsesResourceString()
    {
        // A hardcoded resource string (no format placeholders) is returned as-is
        var method = typeof(ITestRunner).GetMethod("SomeMethod")!;
        var job = new Job(typeof(ITestRunner), method, "arg1", "arg2");

        var attr = new MutexAttribute("ParatextSync");
        var keyFormat = InvokeGetKeyFormat(attr, job);

        Assert.That(keyFormat, Is.EqualTo("ParatextSync"));
    }

    [Test]
    public void GetKeyFormat_WithFormatPlaceholder_ExpandsFirstArgCorrectly()
    {
        // Verify the fix: {0} must expand to the first argument, not produce "System.Object[]"
        var method = typeof(ITestRunner).GetMethod("SomeMethod")!;
        var jobProjectA = new Job(typeof(ITestRunner), method, "projectA", "user1");
        var jobProjectB = new Job(typeof(ITestRunner), method, "projectB", "user2");

        var attr = new MutexAttribute("{0}");
        string keyA = InvokeGetKeyFormat(attr, jobProjectA);
        string keyB = InvokeGetKeyFormat(attr, jobProjectB);

        // Must extract the first argument (project id), not produce the same "System.Object[]" string
        Assert.That(keyA, Is.EqualTo("projectA"), "Key must be the first argument, not a type name");
        Assert.That(keyB, Is.EqualTo("projectB"), "Key must be the first argument, not a type name");
        Assert.That(keyA, Is.Not.EqualTo(keyB), "Different projects must produce different keys");
        Assert.That(keyA, Is.Not.EqualTo("System.Object[]"), "Key must not be the array type name");
    }

    [Test]
    public void IParatextSyncRunner_RunAsync_HasMutexAttributeWithParatextSyncResource()
    {
        // Verify that the system-wide global sync mutex uses "ParatextSync" as the explicit resource key.
        // Using an explicit resource key rather than the method-name fallback prevents accidental key
        // collisions and makes the intent clear.
        var method = typeof(IParatextSyncRunner).GetMethod("RunAsync")!;
        var mutexAttr = method.GetCustomAttributes<MutexAttribute>(inherit: false).SingleOrDefault();

        Assert.That(mutexAttr, Is.Not.Null, "IParatextSyncRunner.RunAsync must have a [Mutex] attribute");
        Assert.That(
            mutexAttr!.Resource,
            Is.EqualTo("ParatextSync"),
            "The mutex resource key must be 'ParatextSync' to enforce a single system-wide sync"
        );
    }

    [Test]
    public void IParatextSyncRunner_RunAsync_MutexKeyIsGlobal()
    {
        // Two sync jobs for different projects must produce the SAME mutex resource key ("ParatextSync"),
        // ensuring only one sync runs system-wide at a time.
        var method = typeof(IParatextSyncRunner).GetMethod("RunAsync")!;
        var jobA = new Job(
            typeof(IParatextSyncRunner),
            method,
            "projectA",
            "userId",
            "metricsA",
            false,
            CancellationToken.None
        );
        var jobB = new Job(
            typeof(IParatextSyncRunner),
            method,
            "projectB",
            "userId",
            "metricsB",
            false,
            CancellationToken.None
        );

        var mutexAttr = method.GetCustomAttribute<MutexAttribute>(inherit: false)!;

        // SUT
        string keyA = InvokeGetKeyFormat(mutexAttr, jobA);
        string keyB = InvokeGetKeyFormat(mutexAttr, jobB);

        Assert.That(
            keyA,
            Is.EqualTo(keyB),
            "All RunAsync jobs must share the same mutex key for system-wide serialization"
        );
        Assert.That(keyA, Is.EqualTo("ParatextSync"), "The shared key must be the explicit 'ParatextSync' resource");
    }

    [Test]
    public void OnStateApplied_WhenTransitioningProcessingToProcessing_DoesNotReleaseMutex()
    {
        // Regression test for the worker-crash re-processing scenario:
        // When a Hangfire worker crashes during a sync, Hangfire re-fetches the same job after the
        // SlidingInvisibilityTimeout and fires a Processing → Processing state transition.
        // OnStateApplied must NOT remove the job from the mutex set in this case, otherwise the set
        // becomes empty while the job is still running and a new sync can start concurrently.
        var connection = Substitute.For<IStorageConnection>();
        var outerTransaction = Substitute.For<IWriteOnlyTransaction>();

        var job = new Job(
            typeof(IParatextSyncRunner),
            typeof(IParatextSyncRunner).GetMethod("RunAsync")!,
            "project01",
            "userId",
            "metricsId",
            false,
            CancellationToken.None
        );
        var backgroundJob = new BackgroundJob("job1", job, DateTime.UtcNow);

        var newProcessingState = Substitute.For<IState>();
        newProcessingState.Name.Returns(ProcessingState.StateName);

        var context = new ApplyStateContext(
            Substitute.For<JobStorage>(),
            connection,
            outerTransaction,
            backgroundJob,
            newProcessingState,
            ProcessingState.StateName // OldStateName = Processing
        );

        var attr = new MutexAttribute("ParatextSync");

        // SUT
        attr.OnStateApplied(context, outerTransaction);

        // The distributed lock must NOT be acquired, and RemoveFromSet must NOT be called
        connection.DidNotReceive().AcquireDistributedLock(Arg.Any<string>(), Arg.Any<TimeSpan>());
        connection.DidNotReceive().CreateWriteTransaction();
    }

    [Test]
    public void OnStateApplied_WhenTransitioningProcessingToSucceeded_ReleasesMutex()
    {
        // Verify the normal cleanup path: when a job finishes (Processing → Succeeded),
        // the mutex set entry IS removed so the next sync can start.
        var writeTransaction = Substitute.For<IWriteOnlyTransaction>();
        var connection = Substitute.For<IStorageConnection>();
        connection
            .AcquireDistributedLock(Arg.Any<string>(), Arg.Any<TimeSpan>())
            .Returns(Substitute.For<IDisposable>());
        connection.CreateWriteTransaction().Returns(writeTransaction);
        var outerTransaction = Substitute.For<IWriteOnlyTransaction>();

        var job = new Job(
            typeof(IParatextSyncRunner),
            typeof(IParatextSyncRunner).GetMethod("RunAsync")!,
            "project01",
            "userId",
            "metricsId",
            false,
            CancellationToken.None
        );
        var backgroundJob = new BackgroundJob("job1", job, DateTime.UtcNow);

        var succeededState = Substitute.For<IState>();
        succeededState.Name.Returns("Succeeded");

        var context = new ApplyStateContext(
            Substitute.For<JobStorage>(),
            connection,
            outerTransaction,
            backgroundJob,
            succeededState,
            ProcessingState.StateName // OldStateName = Processing
        );

        var attr = new MutexAttribute("ParatextSync");

        // SUT
        attr.OnStateApplied(context, outerTransaction);

        // The distributed lock must be acquired and RemoveFromSet must be called
        connection.Received(1).AcquireDistributedLock(Arg.Any<string>(), Arg.Any<TimeSpan>());
        writeTransaction.Received(1).RemoveFromSet(Arg.Any<string>(), "job1");
    }

    /// <summary>
    /// Calls the private static <c>GetKeyFormat</c> method on <see cref="MutexAttribute"/> via reflection.
    /// </summary>
    private static string InvokeGetKeyFormat(MutexAttribute attr, Job job)
    {
        var method = typeof(MutexAttribute).GetMethod("GetKeyFormat", BindingFlags.NonPublic | BindingFlags.Static)!;
        return (string)method.Invoke(null, [job, attr.Resource])!;
    }

    /// <summary>
    /// Minimal stub interface whose <c>SomeMethod</c> carries no special attributes, used to test
    /// <see cref="MutexAttribute.GetKeyFormat"/> with a method name or format-string resource.
    /// </summary>
    private interface ITestRunner
    {
        /// <summary>A plain method used as the target job for key-format tests.</summary>
        void SomeMethod(string arg1, string arg2);
    }
}

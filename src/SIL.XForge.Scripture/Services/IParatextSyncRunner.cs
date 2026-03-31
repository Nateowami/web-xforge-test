using System.Threading;
using System.Threading.Tasks;

namespace SIL.XForge.Scripture.Services;

public interface IParatextSyncRunner
{
    [Mutex("ParatextSync")]
    Task RunAsync(string projectId, string userId, string syncMetricsId, bool trainEngine, CancellationToken token);
}

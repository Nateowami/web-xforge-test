using System.Threading;
using System.Threading.Tasks;

namespace SIL.XForge.Scripture.Services;

public interface IParatextSyncRunner
{
    [Mutex("{0}")]
    Task RunAsync(string projectId, string userId, string syncMetricsId, bool trainEngine, CancellationToken token);
}

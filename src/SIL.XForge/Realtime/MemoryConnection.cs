using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using SIL.XForge.Configuration;
using SIL.XForge.DataAccess;
using SIL.XForge.Models;

namespace SIL.XForge.Realtime;

[ExcludeFromCodeCoverage(Justification = "This code is only used in unit tests")]
public class MemoryConnection(MemoryRealtimeService realtimeService) : IConnection
{
    /// <summary>
    /// A cache of the documents.
    /// </summary>
    private readonly Dictionary<(string, string), object> _documents = [];

    /// <summary>
    /// Begins the transaction.
    /// </summary>
    /// <returns>
    /// A null value.
    /// </returns>
    /// <remarks>
    /// The <see cref="MemoryConnection" /> does not support transactions.
    /// No exception is thrown for compatibility reasons.
    /// </remarks>
    public void BeginTransaction() { }

    /// <summary>
    /// Commits the transaction.
    /// </summary>
    /// <remarks>
    /// The <see cref="MemoryConnection" /> does not support transactions.
    /// No exception is thrown for compatibility reasons.
    /// </remarks>
    public Task CommitTransactionAsync() => Task.CompletedTask;

    /// <summary>
    /// Creates a document asynchronously.
    /// </summary>
    /// <exception cref="NotImplementedException">
    /// This is not supported by a <see cref="MemoryConnection" />.
    /// </exception>
    public Task<Snapshot<T>> CreateDocAsync<T>(string collection, string id, T data, string otTypeName) =>
        throw new NotImplementedException();

    /// <summary>
    /// Deletes a document asynchronously.
    /// </summary>
    /// <exception cref="NotImplementedException">
    /// This is not supported by a <see cref="MemoryConnection" />.
    /// </exception>
    public Task DeleteDocAsync(string collection, string id) => throw new NotImplementedException();

    public void Dispose() => GC.SuppressFinalize(this);

    public ValueTask DisposeAsync()
    {
        GC.SuppressFinalize(this);
        return ValueTask.CompletedTask;
    }

    /// <summary>
    /// Excludes the field from the transaction.
    /// </summary>
    /// <typeparam name="T">The type.</typeparam>
    /// <param name="field">The field.</param>
    /// <remarks>
    /// The <see cref="MemoryConnection" /> does not support transactions.
    /// </remarks>
    public void ExcludePropertyFromTransaction<T>(Expression<Func<T, object>> field) { }

    /// <summary>
    /// Fetches a document asynchronously.
    /// </summary>
    /// <exception cref="NotImplementedException">
    /// This is not supported by a <see cref="MemoryConnection" />.
    /// </exception>
    public Task<Snapshot<T>> FetchDocAsync<T>(string collection, string id) => throw new NotImplementedException();

    /// <summary>
    /// Fetches a document snapshot at a point in time asynchronously.
    /// </summary>
    public async Task<Snapshot<T>> FetchSnapshotAsync<T>(string id, DateTime timestamp)
        where T : IIdentifiable
    {
        var doc = Get<T>(id);
        await doc.FetchAsync();

        // Handle no snapshot present if the timestamp is too old
        if (timestamp == DateTime.MinValue)
        {
            return new Snapshot<T> { Id = doc.Id };
        }

        return new Snapshot<T>
        {
            Data = doc.Data,
            Id = doc.Id,
            Version = doc.Version,
        };
    }

    /// <summary>
    /// Gets the ops for a document.
    /// </summary>
    /// <returns>An Op array.</returns>
    public Task<Op[]> GetOpsAsync<T>(string id)
        where T : IIdentifiable => Task.FromResult(realtimeService.GetRepository<T>().GetOps(id));

    public IDocument<T> Get<T>(string id)
        where T : IIdentifiable
    {
        DocConfig docConfig = realtimeService.GetDocConfig<T>();
        if (_documents.TryGetValue((docConfig.CollectionName, id), out object docObj))
            return (IDocument<T>)docObj;

        MemoryRepository<T> repo = realtimeService.GetRepository<T>();
        IDocument<T> doc = new MemoryDocument<T>(repo, docConfig.OTTypeName, docConfig.CollectionName, id);
        _documents[(docConfig.CollectionName, id)] = doc;
        return doc;
    }

    public async Task<IReadOnlyCollection<IDocument<T>>> GetAndFetchDocsAsync<T>(IReadOnlyCollection<string> ids)
        where T : IIdentifiable
    {
        List<IDocument<T>> docs = [];
        foreach (IDocument<T> doc in ids.Select(Get<T>))
        {
            await doc.FetchAsync();
            if (doc.IsLoaded)
            {
                docs.Add(doc);
            }
        }

        return docs;
    }

    /// <summary>
    /// Rolls back the transaction.
    /// </summary>
    /// <remarks>
    /// The <see cref="MemoryConnection" /> does not support transactions.
    /// </remarks>
    public void RollbackTransaction() { }

    /// <summary>
    /// Submits an operation asynchronously.
    /// </summary>
    /// <exception cref="NotImplementedException">
    /// This is not supported by a <see cref="MemoryConnection" />.
    /// </exception>
    public Task<Snapshot<T>> SubmitOpAsync<T>(
        string collection,
        string id,
        object op,
        T currentDoc,
        int currentVersion,
        OpSource? source
    ) => throw new NotImplementedException();

    /// <summary>
    /// Replaces a document asynchronously.
    /// </summary>
    /// <exception cref="NotImplementedException">
    /// This is not supported by a <see cref="MemoryConnection" />.
    /// </exception>
    public Task<Snapshot<T>> ReplaceDocAsync<T>(
        string collection,
        string id,
        T data,
        int currentVersion,
        OpSource? source
    ) => throw new NotImplementedException();
}

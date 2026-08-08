namespace SIL.XForge.Scripture.Models;

/// <summary>
/// Represents the progress data for a single book calculated from the database aggregation.
/// </summary>
public class BookProgress
{
    /// <summary>
    /// The book identifier (e.g. "GEN", "MAT").
    /// </summary>
    public string BookId { get; set; } = string.Empty;

    /// <summary>
    /// The total number of verses in this book. A verse split over several segments (e.g. because its text
    /// continues into another paragraph) is counted once.
    /// </summary>
    public int VerseSegments { get; set; }

    /// <summary>
    /// The number of untranslated verses in this book, i.e. verses whose every segment is blank.
    /// </summary>
    public int BlankVerseSegments { get; set; }

    /// <summary>
    /// The progress data for each chapter in this book.
    /// </summary>
    public ChapterProgress[] Chapters { get; set; } = [];
}

/// <summary>
/// A single chapter's translation-progress counts within a <see cref="BookProgress"/>, so clients can make
/// chapter-level decisions (e.g. which chapters to offer for partial drafting).
/// </summary>
public class ChapterProgress
{
    public int ChapterNumber { get; set; }

    /// <summary>
    /// The total number of verses in this chapter. See <see cref="BookProgress.VerseSegments"/>.
    /// </summary>
    public int VerseSegments { get; set; }

    /// <summary>
    /// The number of untranslated verses in this chapter. See <see cref="BookProgress.BlankVerseSegments"/>.
    /// </summary>
    public int BlankVerseSegments { get; set; }
}

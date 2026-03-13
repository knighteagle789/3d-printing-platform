using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;

namespace PrintHub.Core.Common
{
    /// <summary>
    /// Enforces the allowed IntakeStatus transitions and documents terminal states.
    ///
    /// Allowed transitions:
    ///   Uploaded     -> Extracting
    ///   Extracting   -> NeedsReview | Failed
    ///   NeedsReview  -> Approved | Rejected
    ///   Failed       -> Extracting  (re-extract retry)
    ///
    /// Terminal states (no transitions out): Approved, Rejected
    /// </summary>
    public static class IntakeStateMachine
    {
        private static readonly Dictionary<IntakeStatus, IntakeStatus[]> _allowed = new()
        {
            [IntakeStatus.Uploaded]    = [IntakeStatus.Extracting],
            [IntakeStatus.Extracting]  = [IntakeStatus.NeedsReview, IntakeStatus.Failed],
            [IntakeStatus.NeedsReview] = [IntakeStatus.Approved, IntakeStatus.Rejected],
            [IntakeStatus.Failed]      = [IntakeStatus.Extracting],
            // Terminal states have no outbound transitions
            [IntakeStatus.Approved]    = [],
            [IntakeStatus.Rejected]    = [],
        };

        /// <summary>
        /// Returns true if transitioning from <paramref name="current"/> to <paramref name="next"/> is permitted.
        /// </summary>
        public static bool CanTransition(IntakeStatus current, IntakeStatus next)
        {
            return _allowed.TryGetValue(current, out var allowed) && allowed.Contains(next);
        }

        /// <summary>
        /// Validates the transition and throws a domain exception if it is not permitted.
        /// </summary>
        public static void EnsureTransition(IntakeStatus current, IntakeStatus next)
        {
            if (!CanTransition(current, next))
            {
                throw new InvalidIntakeTransitionException(current, next);
            }
        }

        public static bool IsTerminal(IntakeStatus status)
            => status is IntakeStatus.Approved or IntakeStatus.Rejected;
    }
}

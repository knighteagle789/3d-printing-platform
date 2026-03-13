using PrintHub.Core.Entities;

namespace PrintHub.Core.Exceptions
{
    /// <summary>
    /// Thrown when a requested IntakeStatus transition is not permitted by the state machine.
    /// Maps to HTTP 409 Conflict via GlobalExceptionMiddleware.
    /// </summary>
    public class InvalidIntakeTransitionException : Exception
    {
        public IntakeStatus CurrentStatus { get; }
        public IntakeStatus RequestedStatus { get; }

        public InvalidIntakeTransitionException(IntakeStatus current, IntakeStatus requested)
            : base($"Cannot transition intake from '{current}' to '{requested}'.")
        {
            CurrentStatus = current;
            RequestedStatus = requested;
        }
    }
}

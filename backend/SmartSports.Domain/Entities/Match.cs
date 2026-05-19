namespace SmartSports.Domain.Entities;

public class Match
{
    public int  Id            { get; set; }
    public int  BookingId     { get; set; }
    public bool IsOpenToJoin  { get; set; }
    public int  MaxPlayers    { get; set; }

    // joined fields — populated when the match is loaded via a query that JOINs bookings,
    // so the service layer can authorize against the booking owner without a second round-trip.
    public int?     BookingOwnerId { get; set; }

    // Booking lifecycle fields — used by InvitationService to reject invites against
    // cancelled bookings or matches whose date is already in the past.
    public string?  BookingStatus  { get; set; }
    public DateOnly BookingDate    { get; set; }
}

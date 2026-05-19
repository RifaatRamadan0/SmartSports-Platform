namespace SmartSports.API.Services;

public interface ICurrentUserService
{
    /// <summary>
    /// Returns the authenticated user's ID parsed from the JWT NameIdentifier claim,
    /// or null if the claim is absent or malformed.
    /// </summary>
    int? GetUserId();

    /// <summary>
    /// Returns the authenticated user's username from the JWT unique_name claim
    /// (mapped to ClaimTypes.Name by the default inbound-claim mapping), or null
    /// if the claim is absent. Lets services compose user-facing strings (e.g.
    /// notification messages) without a second DB round-trip for the user row.
    /// </summary>
    string? GetUsername();
}

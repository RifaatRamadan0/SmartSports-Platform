namespace SmartSports.API.Services;

public interface ICurrentUserService
{
    /// <summary>
    /// Returns the authenticated user's ID parsed from the JWT NameIdentifier claim,
    /// or null if the claim is absent or malformed.
    /// </summary>
    int? GetUserId();
}

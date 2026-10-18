namespace SmartSports.Domain.Common;

/// <summary>
/// The shared demo logins seeded by migration 033, whose password is public on the
/// login page. Keyed on email because no endpoint can change it, unlike username.
/// Blocking changes stops one visitor from breaking the demo for the next.
/// </summary>
public static class DemoAccounts
{
    public const string ReadOnlyMessage = "Shared demo accounts can't be changed.";

    private static readonly HashSet<string> Emails = new(StringComparer.OrdinalIgnoreCase)
    {
        "demo_player@example.com",
        "demo_owner@example.com",
        "demo_admin@example.com",
    };

    public static bool IsDemo(string email) => Emails.Contains(email);
}

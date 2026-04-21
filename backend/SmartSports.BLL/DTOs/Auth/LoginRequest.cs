using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmartSports.BLL.DTOs.Auth
{
    public class LoginRequest
    {
        public string EmailorUsername { get; set; } = string.Empty;

        // The plain text password — we will hash this and compare it
        // to the stored hash, we never store this value
        public string Password { get; set; } = string.Empty;
    }
}

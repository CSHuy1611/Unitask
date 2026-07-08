using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

class Program {
    static void Main() {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes("SuperSecretKey@1234567890_UniTask_API_Key_Very_Long");
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "04e639fe-1913-4c80-8134-6b7549138dbd"),
                new Claim(ClaimTypes.Role, "Student")
            }),
            Expires = DateTime.UtcNow.AddDays(1),
            Issuer = "UniTaskApi",
            Audience = "UniTaskClient",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        Console.WriteLine(tokenHandler.WriteToken(token));
    }
}

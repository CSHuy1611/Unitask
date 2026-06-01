using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();

// ===== CORS Configuration =====
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        var frontendUrl = builder.Configuration["Frontend:Url"] ?? "http://localhost:4200";
        policy.WithOrigins("http://localhost:4200", "http://localhost:8080", frontendUrl)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Swagger JWT Config
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "UniTask API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme. 
                      Enter 'Bearer' [space] and then your token in the text input below.
                      Example: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

// ===== Database & Identity =====
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ===== Business Services Registration =====
builder.Services.AddScoped<UniTask.Business.Interfaces.ITokenService, UniTask.Business.Services.TokenService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IAuthService, UniTask.Business.Services.AuthService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.ICloudinaryService, UniTask.Business.Services.CloudinaryService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IProfileService, UniTask.Business.Services.ProfileService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IJobService, UniTask.Business.Services.JobService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IApplicationService, UniTask.Business.Services.ApplicationService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IWalletService, UniTask.Business.Services.WalletService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.ISavedJobService, UniTask.Business.Services.SavedJobService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.ISubscriptionService, UniTask.Business.Services.SubscriptionService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IAdminService, UniTask.Business.Services.AdminService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IPaymentService, UniTask.Business.Services.PaymentService>();
builder.Services.AddScoped<UniTask.Business.Interfaces.IEmailService, UniTask.Business.Services.EmailService>();

// ===== JWT Authentication =====
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

var app = builder.Build();

// ===== Auto Migrate & Seed Data =====
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        await context.Database.MigrateAsync();

        // Seed data
        await DataSeeder.SeedAsync(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Lỗi khi migration hoặc seed database.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAngular");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<UniTask.Business.Hubs.DashboardHub>("/hub/dashboard");

app.Run();


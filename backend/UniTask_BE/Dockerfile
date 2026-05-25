FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy sln and csproj files for restoring dependencies
COPY ["UniTask.Api/UniTask.Api.csproj", "UniTask.Api/"]
COPY ["UniTask.Business/UniTask.Business.csproj", "UniTask.Business/"]
COPY ["UniTask.DataAcesss/UniTask.DataAcesss.csproj", "UniTask.DataAcesss/"]
COPY ["UniTask_Backend.sln", "./"]

RUN dotnet restore

# Copy the rest of the source code
COPY . .

# Build and publish
RUN dotnet publish "UniTask.Api/UniTask.Api.csproj" --no-restore -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --chown=app:app --from=build /app/publish .

# Run as non-root user (provided by default in .NET 8 images)
USER app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["dotnet", "UniTask.Api.dll"]

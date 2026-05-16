using UniTask.DataAcesss.Entities;

namespace UniTask.Business.Interfaces
{
    public interface ITokenService
    {
        string GenerateToken(ApplicationUser user, IList<string> roles);
    }
}

using System.ComponentModel.DataAnnotations;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.DTOs.Application
{
    public class ApplicationStatusUpdateDto
    {
        [Required]
        public ApplicationStatus Status { get; set; }
    }
}

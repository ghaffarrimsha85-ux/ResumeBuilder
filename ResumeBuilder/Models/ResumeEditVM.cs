using System.Collections.Generic;

namespace ResumeBuilder.Models
{
    public class ResumeEditVM
    {
        public Resume Resume { get; set; }
        public PersonalInfo Personal { get; set; }
        public List<Education> Educations { get; set; }
        public List<Experience> Experiences { get; set; }
        public List<Skill> Skills { get; set; }
        public List<Project> Projects { get; set; }
        public List<Certification> Certifications { get; set; }
        public List<Language> Languages { get; set; }
        public List<Hobby> Hobbies { get; set; }
    }
}
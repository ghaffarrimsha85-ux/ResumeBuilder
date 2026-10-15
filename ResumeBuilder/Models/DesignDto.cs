namespace ResumeBuilder.Models
{
    public class DesignDto
    {
        public string TemplateName { get; set; }
        public string PrimaryColor { get; set; }
        public string SecondaryColor { get; set; }
        public string TextColor { get; set; }
        public string BackgroundColor { get; set; }
        public string FontFamily { get; set; }
        public string FontSize { get; set; }
        public string Theme { get; set; }
        public string Spacing { get; set; }
        public string SectionOrder { get; set; }
        public string HiddenSections { get; set; }
    }
}
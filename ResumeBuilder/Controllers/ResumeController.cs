using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;
using ResumeBuilder.Models;

namespace ResumeBuilder.Controllers
{
    public class ResumeController : Controller
    {
        ResumeBuilderDBnewEntities db = new ResumeBuilderDBnewEntities();

        // ---------- helpers ----------
        Resume GetOwnedResume(int id)
        {
            if (Session["UserId"] == null) return null;
            int uid = (int)Session["UserId"];
            return db.Resumes.FirstOrDefault(r => r.ResumeId == id && r.UserId == uid);
        }

        JsonResult Fail(string msg)
        {
            return Json(new { success = false, message = msg });
        }

        // ---------- EDIT PAGE ----------
        [HttpGet]
        public ActionResult Edit(int id)
        {
            if (Session["UserId"] == null)
                return RedirectToAction("Login", "Account");

            var resume = GetOwnedResume(id);
            if (resume == null)
                return RedirectToAction("Index", "Dashboard");

            var personal = db.Set<PersonalInfo>().FirstOrDefault(x => x.ResumeId == id);
            if (personal == null)
            {
                // prefill from the registered user
                int uid = (int)Session["UserId"];
                var user = db.Users.FirstOrDefault(u => u.UserId == uid);
                personal = new PersonalInfo
                {
                    FullName = user != null ? user.FullName : "",
                    Email = user != null ? user.Email : "",
                    Phone = user != null ? user.Phone : ""
                };
            }

            var vm = new ResumeEditVM
            {
                Resume = resume,
                Personal = personal,
                Educations = db.Set<Education>().Where(x => x.ResumeId == id).ToList(),
                Experiences = db.Set<Experience>().Where(x => x.ResumeId == id).ToList(),
                Skills = db.Set<Skill>().Where(x => x.ResumeId == id).ToList(),
                Projects = db.Set<Project>().Where(x => x.ResumeId == id).ToList(),
                Certifications = db.Set<Certification>().Where(x => x.ResumeId == id).ToList(),
                Languages = db.Set<Language>().Where(x => x.ResumeId == id).ToList(),
                Hobbies = db.Set<Hobby>().Where(x => x.ResumeId == id).ToList()
            };
            return View(vm);
        }

        // ---------- STEP 1: PERSONAL INFO ----------
        [HttpPost]
        public JsonResult SavePersonal(int resumeId, string title, PersonalInfo data)
        {
            var resume = GetOwnedResume(resumeId);
            if (resume == null) return Fail("Resume not found or session expired.");

            if (data == null || string.IsNullOrWhiteSpace(data.FullName) || string.IsNullOrWhiteSpace(data.Email))
                return Fail("Full name and email are required.");

            var p = db.Set<PersonalInfo>().FirstOrDefault(x => x.ResumeId == resumeId);
            if (p == null)
            {
                p = new PersonalInfo { ResumeId = resumeId };
                db.Set<PersonalInfo>().Add(p);
            }

            p.FullName = data.FullName;
            p.JobTitle = data.JobTitle;
            p.Email = data.Email;
            p.Phone = data.Phone;
            p.Address = data.Address;
            p.PhotoPath = data.PhotoPath;
            p.Summary = data.Summary;

            if (!string.IsNullOrWhiteSpace(title)) resume.Title = title.Trim();
            resume.UpdatedAt = DateTime.Now;

            db.SaveChanges();
            return Json(new { success = true });
        }

        // ---------- PHOTO UPLOAD ----------
        [HttpPost]
        public JsonResult UploadPhoto(int resumeId, HttpPostedFileBase file)
        {
            if (GetOwnedResume(resumeId) == null) return Fail("Resume not found or session expired.");
            if (file == null || file.ContentLength == 0) return Fail("Please choose an image.");
            if (file.ContentLength > 2 * 1024 * 1024) return Fail("Image must be 2 MB or smaller.");

            string ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return Fail("Only JPG and PNG images are allowed.");

            string folder = Server.MapPath("~/Uploads/Photos");
            Directory.CreateDirectory(folder);

            string name = "resume_" + resumeId + "_" + DateTime.Now.Ticks + ext;
            file.SaveAs(Path.Combine(folder, name));

            string virtualPath = "~/Uploads/Photos/" + name;
            return Json(new { success = true, path = virtualPath, url = Url.Content(virtualPath) });
        }

        // ---------- STEPS 2-8: LIST SECTIONS ----------
        JsonResult SaveList<T>(string table, int resumeId, List<T> items, Action<T> setResumeId) where T : class
        {
            var resume = GetOwnedResume(resumeId);
            if (resume == null) return Fail("Resume not found or session expired.");

            // remove old rows, then insert the new ones
            db.Database.ExecuteSqlCommand("DELETE FROM " + table + " WHERE ResumeId = @p0", resumeId);

            if (items != null)
            {
                foreach (var item in items)
                {
                    setResumeId(item);
                    db.Set<T>().Add(item);
                }
            }

            resume.UpdatedAt = DateTime.Now;
            db.SaveChanges();
            return Json(new { success = true });
        }

        [HttpPost]
        public JsonResult SaveEducation(int resumeId, List<Education> items)
        { return SaveList("Education", resumeId, items, x => x.ResumeId = resumeId); }

        [HttpPost]
        public JsonResult SaveExperience(int resumeId, List<Experience> items)
        { return SaveList("Experience", resumeId, items, x => x.ResumeId = resumeId); }

        [HttpPost]
        public JsonResult SaveSkills(int resumeId, List<Skill> items)
        { return SaveList("Skills", resumeId, items, x => x.ResumeId = resumeId); }

        [HttpPost]
        public JsonResult SaveProjects(int resumeId, List<Project> items)
        { return SaveList("Projects", resumeId, items, x => x.ResumeId = resumeId); }

        [HttpPost]
        public JsonResult SaveCertifications(int resumeId, List<Certification> items)
        { return SaveList("Certifications", resumeId, items, x => x.ResumeId = resumeId); }

        [HttpPost]
        public JsonResult SaveLanguages(int resumeId, List<Language> items)
        { return SaveList("Languages", resumeId, items, x => x.ResumeId = resumeId); }

        [HttpPost]
        public JsonResult SaveHobbies(int resumeId, List<Hobby> items)
        { return SaveList("Hobbies", resumeId, items, x => x.ResumeId = resumeId); }


        // ---------- DESIGN PAGE (template + customization + preview) ----------
        [HttpGet]
        public ActionResult Design(int id)
        {
            var result = Edit(id);                 // same data as the wizard
            var view = result as ViewResult;
            if (view == null) return result;       // redirect (not logged in / not owner)
            return View("Design", view.Model);
        }

        static readonly string[] SectionKeys =
            { "summary", "experience", "education", "projects", "skills", "certifications", "languages", "hobbies" };
        static readonly string[] Templates =
      { "classic", "modern", "executive", "minimal", "creative", "compact", "elegant", "bold", "timeline" };
        static bool IsColor(string c)
        {
            return !string.IsNullOrEmpty(c) && Regex.IsMatch(c, "^#[0-9a-fA-F]{6}$");
        }

        static string CleanKeys(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            return string.Join(",", s.Split(',')
                .Select(x => x.Trim().ToLower())
                .Where(x => SectionKeys.Contains(x))
                .Distinct());
        }

        [HttpPost]
        public JsonResult SaveDesign(int resumeId, DesignDto data)
        {
            var resume = GetOwnedResume(resumeId);
            if (resume == null) return Fail("Resume not found or session expired.");
            if (data == null) return Fail("No data received.");

            if (!Templates.Contains(data.TemplateName ?? ""))
                return Fail("Please choose a valid template.");
            if (!IsColor(data.PrimaryColor) || !IsColor(data.SecondaryColor) ||
                !IsColor(data.TextColor) || !IsColor(data.BackgroundColor))
                return Fail("Invalid color value.");
            if (!new[] { "Arial", "Roboto", "Poppins", "Times New Roman" }.Contains(data.FontFamily ?? ""))
                return Fail("Invalid font.");
            if (!new[] { "Small", "Medium", "Large" }.Contains(data.FontSize ?? ""))
                return Fail("Invalid font size.");
            if (!new[] { "Light", "Dark" }.Contains(data.Theme ?? ""))
                return Fail("Invalid theme.");
            if (!new[] { "Compact", "Normal", "Spacious" }.Contains(data.Spacing ?? ""))
                return Fail("Invalid spacing.");

            resume.TemplateName = data.TemplateName;
            resume.PrimaryColor = data.PrimaryColor;
            resume.SecondaryColor = data.SecondaryColor;
            resume.TextColor = data.TextColor;
            resume.BackgroundColor = data.BackgroundColor;
            resume.FontFamily = data.FontFamily;
            resume.FontSize = data.FontSize;
            resume.Theme = data.Theme;
            resume.Spacing = data.Spacing;
            resume.SectionOrder = CleanKeys(data.SectionOrder);
            resume.HiddenSections = CleanKeys(data.HiddenSections);
            resume.UpdatedAt = DateTime.Now;

            db.SaveChanges();
            return Json(new { success = true });
        }
        protected override void Dispose(bool disposing)
        {
            if (disposing) db.Dispose();
            base.Dispose(disposing);
        }
    }
}
using System;
using System.Linq;
using System.Web.Mvc;
using ResumeBuilder.Models;

namespace ResumeBuilder.Controllers
{
    public class DashboardController : Controller
    {
        ResumeBuilderDBnewEntities db = new ResumeBuilderDBnewEntities();

        // ---------- DASHBOARD ----------
        public ActionResult Index()
        {
            if (Session["UserId"] == null)
                return RedirectToAction("Login", "Account");

            int userId = (int)Session["UserId"];

            var resumes = db.Resumes
                            .Where(r => r.UserId == userId)
                            .OrderByDescending(r => r.UpdatedAt)
                            .ToList();

            return View(resumes);
        }

        // ---------- CREATE NEW RESUME ----------
        [HttpPost]
        public ActionResult CreateResume()
        {
            if (Session["UserId"] == null)
                return RedirectToAction("Login", "Account");

            var resume = new Resume
            {
                UserId = (int)Session["UserId"],
                Title = "Untitled Resume",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            db.Resumes.Add(resume);
            db.SaveChanges();

            // Resume form page (next step)
            return RedirectToAction("Edit", "Resume", new { id = resume.ResumeId });
        }

        // ---------- DELETE RESUME ----------
        [HttpPost]
        public ActionResult DeleteResume(int id)
        {
            if (Session["UserId"] == null)
                return RedirectToAction("Login", "Account");

            int userId = (int)Session["UserId"];
            var resume = db.Resumes.FirstOrDefault(r => r.ResumeId == id && r.UserId == userId);

            if (resume != null)
            {
                db.Resumes.Remove(resume);
                db.SaveChanges();
                TempData["Success"] = "Resume deleted successfully.";
            }
            else
            {
                TempData["Error"] = "Resume not found.";
            }

            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) db.Dispose();
            base.Dispose(disposing);
        }
    }
}
using System.Linq;
using System.Web.Mvc;
using ResumeBuilder.Models;

namespace ResumeBuilder.Controllers
{
    public class AccountController : Controller
    {
        ResumeBuilderDBnewEntities db = new ResumeBuilderDBnewEntities();

        // ---------- REGISTER ----------
        [HttpGet]
        public ActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public ActionResult Register(User model, string ConfirmPassword)
        {
            if (string.IsNullOrEmpty(model.FullName) ||
                string.IsNullOrEmpty(model.Email) ||
                string.IsNullOrEmpty(model.Password))
            {
                ViewBag.Error = "Full Name, Email and Password are required.";
                return View(model);
            }

            if (model.Password != ConfirmPassword)
            {
                ViewBag.Error = "Password and Confirm Password do not match.";
                return View(model);
            }

            bool emailExists = db.Users.Any(u => u.Email == model.Email);
            if (emailExists)
            {
                ViewBag.Error = "This email is already registered.";
                return View(model);
            }

            db.Users.Add(model);
            db.SaveChanges();

            TempData["Success"] = "Registration successful. Please login.";
            return RedirectToAction("Login");
        }

        // ---------- LOGIN ----------
        [HttpGet]
        public ActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public ActionResult Login(string email, string password)
        {
            var user = db.Users
                         .FirstOrDefault(u => u.Email == email && u.Password == password);

            if (user == null)
            {
                ViewBag.Error = "Invalid email or password.";
                return View();
            }

            Session["UserId"] = user.UserId;
            Session["UserName"] = user.FullName;

            return RedirectToAction("Index", "Dashboard");
        }

        // ---------- LOGOUT ----------
        public ActionResult Logout()
        {
            Session.Clear();
            Session.Abandon();
            return RedirectToAction("Index", "Home");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) db.Dispose();
            base.Dispose(disposing);
        }
    }
}
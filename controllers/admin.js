exports.renderHome = async (req, res) => {
  return res.render("admin/dashboard", {
    title: "Admin Dashboard",
    user: req.user,
  });
};

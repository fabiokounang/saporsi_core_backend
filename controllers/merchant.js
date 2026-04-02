exports.renderHome = async (req, res) => {
  return res.render("merchant/dashboard", {
    title: "Merchant Dashboard",
    user: req.user,
  });
};
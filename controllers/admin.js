const orderModel = require("../models/order");
const merchantModel = require("../models/merchant");
const locationModel = require("../models/location");
const machineModel = require("../models/machine");
const productModel = require("../models/product");
const slotModel = require("../models/slot");

exports.renderHome = async (req, res, next) => {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultFrom = `${yyyy}-${mm}-01`;
    const defaultTo = `${yyyy}-${mm}-${dd}`;

    const dateFrom = String(req.query.date_from || defaultFrom);
    const dateTo = String(req.query.date_to || defaultTo);

    const [summary, merchants, locations, machines, products, slotsTotal, slotsActive] =
      await Promise.all([
        orderModel.getAdminDashboardSummary({
          dateFrom,
          dateTo,
        }),
        merchantModel.countAll(),
        locationModel.countAll({ mastersOnly: true }),
        machineModel.countAll(),
        productModel.countAll(),
        slotModel.countAll(),
        slotModel.countActive(),
      ]);

    const idr = new Intl.NumberFormat("id-ID");
    return res.render("admin/dashboard", {
      title: "Admin Dashboard",
      user: req.user,
      dateFrom,
      dateTo,
      summary: {
        turnover: summary.turnover,
        turnoverFmt: idr.format(summary.turnover),
        profit: summary.profit,
        profitFmt: idr.format(summary.profit),
        transactions: summary.transactions,
      },
      ownerStats: {
        merchants,
        locations,
        machines,
        products,
        slotsTotal,
        slotsActive,
      },
    });
  } catch (err) {
    return next(err);
  }
};

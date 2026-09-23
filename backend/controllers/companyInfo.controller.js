const CompanyInfo = require("../models/companyInfo.model");

const getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await CompanyInfo.findOne().select("-createdBy -updatedBy");

    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
    }

    const isAddressPublished = companyInfo.status === "published";

    const data = {
      _id: companyInfo._id,
      companyName: companyInfo.companyName || "",
      appName: companyInfo.appName || "",
      status: companyInfo.status,
      isAddressPublished,
      addressLine1: isAddressPublished ? (companyInfo.addressLine1 || "") : "",
      addressLine2: isAddressPublished ? (companyInfo.addressLine2 || "") : "",
      city: isAddressPublished ? (companyInfo.city || "") : "",
      state: isAddressPublished ? (companyInfo.state || "") : "",
      country: isAddressPublished ? (companyInfo.country || "") : "",
      postalCode: isAddressPublished ? (companyInfo.postalCode || "") : "",
      googleMapUrl: isAddressPublished ? (companyInfo.googleMapUrl || "") : "",
      createdAt: companyInfo.createdAt,
      updatedAt: companyInfo.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get Company Info Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company information.",
    });
  }
};

module.exports = {
  getCompanyInfo,
};
const SupportTicket = require(
  "../../models/supportTicket.model"
);

const SupportMessage = require(
  "../../models/supportMessage.model"
);


// ========================================
// GET ALL TICKETS
// ========================================
exports.getAllTickets = async (
  req,
  res
) => {
  try {
    const tickets =
      await SupportTicket.find()
        .populate(
          "user",
          "name phone email"
        )
        .sort({
          updatedAt: -1,
        });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });

  } catch (error) {
    console.error(
      "Get All Tickets Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// GET SINGLE TICKET
// ========================================
exports.getAdminSingleTicket =
  async (req, res) => {
    try {
      const ticket =
        await SupportTicket.findById(
          req.params.id
        ).populate(
          "user",
          "name phone email"
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      // ========================================
      // GET CONVERSATION
      // ========================================
      const messages =
        await SupportMessage.find({
          ticket: ticket._id,
        })
          .populate(
            "senderId",
            "name email"
          )
          .sort({
            createdAt: 1,
          });

      res.status(200).json({
        success: true,
        ticket,
        messages,
      });

    } catch (error) {
      console.error(
        "Get Admin Single Ticket Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };


// ========================================
// ADMIN REPLY
// ========================================
exports.adminReplyTicket =
  async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message:
            "Message is required",
        });
      }

      const ticket =
        await SupportTicket.findById(
          req.params.id
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      // ========================================
      // TICKET CLOSED CHECK
      // ========================================
      if (ticket.status === "CLOSED") {
        return res.status(400).json({
          success: false,
          message: "Ticket is closed",
        });
      }

      let attachments = [];
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => file.cdnUrl || file.path);
      } else if (req.body.attachments) {
        attachments = Array.isArray(req.body.attachments)
          ? req.body.attachments
          : typeof req.body.attachments === "string"
            ? [req.body.attachments]
            : [];
      }

      // ========================================
      // CREATE ADMIN MESSAGE
      // ========================================
      await SupportMessage.create({
        ticket: ticket._id,
        senderType: "ADMIN",
        senderModel: "Admin",
        senderId: req.user.id,
        message,
        attachments,
      });

      // ========================================
      // UPDATE TICKET
      // ========================================
      ticket.lastMessage = message;

      // waiting for customer response
      ticket.status = "PENDING";

      if (attachments && attachments.length > 0) {
        ticket.attachments = [...(ticket.attachments || []), ...attachments];
      }

      await ticket.save();

      // ========================================
      // RETURN UPDATED CHAT
      // ========================================
      const messages =
        await SupportMessage.find({
          ticket: ticket._id,
        })
          .populate(
            "senderId",
            "name email"
          )
          .sort({
            createdAt: 1,
          });

      res.status(200).json({
        success: true,
        message:
          "Reply sent successfully",
        messages,
      });

    } catch (error) {
      console.error(
        "Admin Reply Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };


// ========================================
// UPDATE TICKET STATUS
// ========================================
exports.updateTicketStatus =
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatus = [
        "OPEN",
        "PENDING",
        "RESOLVED",
        "CLOSED",
      ];

      if (
        !allowedStatus.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const ticket =
        await SupportTicket.findById(
          req.params.id
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      ticket.status = status;

      await ticket.save();

      res.status(200).json({
        success: true,
        message:
          "Status updated successfully",
        ticket,
      });

    } catch (error) {
      console.error(
        "Update Status Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
  // ========================================
  // GET COMPLETE CONVERSATION
  // ========================================
  exports.getAdminTicketConversation =
    async (req, res) => {
      try {
        const ticket =
          await SupportTicket.findOne({
            _id: req.params.id,
            user: req.user.id,
          }).populate(
            "user",
            "name email phone"
          );
  
        if (!ticket) {
          return res.status(404).json({
            success: false,
            message: "Ticket not found",
          });
        }
  
        const messages =
          await SupportMessage.find({
            ticket: ticket._id,
          })
            .populate(
              "senderId",
              "name email"
            )
            .sort({
              createdAt: 1,
            });
  
        res.status(200).json({
          success: true,
  
          conversation: {
            ticketId: ticket._id,
            subject: ticket.subject,
            category: ticket.category,
            status: ticket.status,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
  
            user: ticket.user,
  
            messages,
          },
        });
  
      } catch (error) {
        console.error(
          "Get Conversation Error:",
          error
        );
  
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    };
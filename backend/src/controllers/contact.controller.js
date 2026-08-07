import { Contact } from '../models/contact.model.js';
import { asyncHandler } from '../utils/asyncHandler.js'; 
import { ApiResponse } from '../utils/ApiResponse.js'; 
import { ApiError } from '../utils/ApiError.js'; 


// @desc    Get dashboard metrics for header summary cards
// @route   GET /api/v1/contacts/stats
export const getRescueStats = asyncHandler(async (req, res) => {
    const [pending, dispatched, rescued, safe, total] = await Promise.all([
        Contact.countDocuments({ rescueStatus: 'pending' }),
        Contact.countDocuments({ rescueStatus: 'dispatched' }),
        Contact.countDocuments({ rescueStatus: 'rescued' }),
        Contact.countDocuments({ rescueStatus: 'safe' }),
        Contact.countDocuments()
    ]);

    return res.status(200).json(
        new ApiResponse(200, { total, pending, dispatched, rescued, safe }, "Stats fetched successfully")
    );
});

// @desc    Get all contacts (Filter by status optional)
// @route   GET /api/v1/contacts
export const getAllContacts = asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    // If a status is passed in the URL (e.g., ?status=pending), filter by it.
    const query = status ? { rescueStatus: status } : {};

    const contacts = await Contact.find(query).sort({ updatedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, contacts, "Contacts fetched successfully")
    );
});

// @desc    Get a single contact by ID
// @route   GET /api/v1/contacts/:contactId
export const getContactById = asyncHandler(async (req, res) => {
    const { contactId } = req.params;

    const contact = await Contact.findById(contactId);

    if (!contact) {
        throw new ApiError(404, "Contact not found");
    }

    return res.status(200).json(
        new ApiResponse(200, contact, "Contact fetched successfully")
    );
});

// @desc    Update a contact's rescue status
// @route   PATCH /api/v1/contacts/:contactId/status
export const updateRescueStatus = asyncHandler(async (req, res) => {
    const { contactId } = req.params;
    const { rescueStatus } = req.body;

    const validStatuses = ['pending', 'dispatched', 'rescued', 'safe'];
    
    if (!validStatuses.includes(rescueStatus)) {
        throw new ApiError(400, "Invalid rescue status provided");
    }

    const updatedContact = await Contact.findByIdAndUpdate(
        contactId,
        { rescueStatus },
        { new: true, runValidators: true }
    );

    if (!updatedContact) {
        throw new ApiError(404, "Contact not found");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedContact, `Status updated to ${rescueStatus}`)
    );
});
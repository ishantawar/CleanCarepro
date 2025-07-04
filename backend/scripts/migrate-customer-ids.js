const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../models/User");

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || process.env.MONGO_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

// Generate customer ID similar to the model logic
const generateCustomerId = (user) => {
  const phoneDigits = user.phone.slice(-4); // Last 4 digits of phone
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const randomNum = Math.floor(Math.random() * 99)
    .toString()
    .padStart(2, "0");

  return `CC${phoneDigits}${timestamp}${randomNum}`;
};

// Migration function
const migrateCustomerIds = async () => {
  try {
    console.log("🔄 Starting customer ID migration...");

    // Find all users without customer_id
    const usersWithoutCustomerId = await User.find({
      $or: [
        { customer_id: { $exists: false } },
        { customer_id: null },
        { customer_id: "" },
      ],
    });

    console.log(
      `📊 Found ${usersWithoutCustomerId.length} users without customer_id`,
    );

    if (usersWithoutCustomerId.length === 0) {
      console.log("✅ All users already have customer_id");
      return;
    }

    let updated = 0;
    let failed = 0;
    const failedUsers = [];

    for (const user of usersWithoutCustomerId) {
      try {
        let customerId = generateCustomerId(user);
        let isUnique = false;
        let attempt = 0;

        // Ensure uniqueness
        while (!isUnique && attempt < 10) {
          const existingUser = await User.findOne({ customer_id: customerId });
          if (!existingUser) {
            isUnique = true;
          } else {
            attempt++;
            customerId = `${customerId}${attempt}`;
          }
        }

        if (!isUnique) {
          // Fallback to ObjectId-based ID
          customerId = `CC${user._id}`;
        }

        // Update the user
        await User.findByIdAndUpdate(user._id, { customer_id: customerId });
        console.log(
          `✅ Updated user ${user.phone} with customer_id: ${customerId}`,
        );
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update user ${user.phone}:`, error.message);
        failed++;
        failedUsers.push({ phone: user.phone, error: error.message });
      }
    }

    console.log("\n📋 Migration Summary:");
    console.log(`✅ Successfully updated: ${updated} users`);
    console.log(`❌ Failed to update: ${failed} users`);

    if (failedUsers.length > 0) {
      console.log("\n❌ Failed users:");
      failedUsers.forEach(({ phone, error }) => {
        console.log(`  - ${phone}: ${error}`);
      });
    }

    // Verify results
    const usersWithCustomerId = await User.countDocuments({
      customer_id: { $exists: true, $ne: null, $ne: "" },
    });
    console.log(
      `\n📊 Total users with customer_id after migration: ${usersWithCustomerId}`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

// Update existing bookings to include customer_code
const migrateBookingCustomerCodes = async () => {
  try {
    console.log("\n🔄 Starting booking customer_code migration...");

    const Booking = require("../models/Booking");

    // Find bookings without customer_code
    const bookingsWithoutCode = await Booking.find({
      $or: [
        { customer_code: { $exists: false } },
        { customer_code: null },
        { customer_code: "" },
      ],
    }).populate("customer_id", "customer_id");

    console.log(
      `📊 Found ${bookingsWithoutCode.length} bookings without customer_code`,
    );

    if (bookingsWithoutCode.length === 0) {
      console.log("✅ All bookings already have customer_code");
      return;
    }

    let updatedBookings = 0;
    let failedBookings = 0;

    for (const booking of bookingsWithoutCode) {
      try {
        if (booking.customer_id && booking.customer_id.customer_id) {
          await Booking.findByIdAndUpdate(booking._id, {
            customer_code: booking.customer_id.customer_id,
          });
          updatedBookings++;
        } else {
          console.warn(`⚠️ Booking ${booking._id} has no valid customer_id`);
          failedBookings++;
        }
      } catch (error) {
        console.error(
          `❌ Failed to update booking ${booking._id}:`,
          error.message,
        );
        failedBookings++;
      }
    }

    console.log("\n📋 Booking Migration Summary:");
    console.log(`✅ Successfully updated: ${updatedBookings} bookings`);
    console.log(`❌ Failed to update: ${failedBookings} bookings`);
  } catch (error) {
    console.error("❌ Booking migration failed:", error);
    throw error;
  }
};

// Update existing addresses to include customer_id
const migrateAddressCustomerIds = async () => {
  try {
    console.log("\n🔄 Starting address customer_id migration...");

    const Address = require("../models/Address");

    // Find addresses without customer_id
    const addressesWithoutCustomerId = await Address.find({
      $or: [
        { customer_id: { $exists: false } },
        { customer_id: null },
        { customer_id: "" },
      ],
    }).populate("user_id", "customer_id");

    console.log(
      `📊 Found ${addressesWithoutCustomerId.length} addresses without customer_id`,
    );

    if (addressesWithoutCustomerId.length === 0) {
      console.log("✅ All addresses already have customer_id");
      return;
    }

    let updatedAddresses = 0;
    let failedAddresses = 0;

    for (const address of addressesWithoutCustomerId) {
      try {
        if (address.user_id && address.user_id.customer_id) {
          await Address.findByIdAndUpdate(address._id, {
            customer_id: address.user_id.customer_id,
          });
          updatedAddresses++;
        } else {
          console.warn(
            `⚠️ Address ${address._id} has no valid user customer_id`,
          );
          failedAddresses++;
        }
      } catch (error) {
        console.error(
          `❌ Failed to update address ${address._id}:`,
          error.message,
        );
        failedAddresses++;
      }
    }

    console.log("\n📋 Address Migration Summary:");
    console.log(`✅ Successfully updated: ${updatedAddresses} addresses`);
    console.log(`❌ Failed to update: ${failedAddresses} addresses`);
  } catch (error) {
    console.error("❌ Address migration failed:", error);
    throw error;
  }
};

// Main execution
const runMigration = async () => {
  try {
    await connectDB();

    console.log("🚀 Starting complete customer ID migration...\n");

    // Step 1: Migrate users
    await migrateCustomerIds();

    // Step 2: Migrate bookings
    await migrateBookingCustomerCodes();

    // Step 3: Migrate addresses
    await migrateAddressCustomerIds();

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
    console.log("📁 Database connection closed");
  }
};

// Run only if called directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateCustomerIds,
  migrateBookingCustomerCodes,
  migrateAddressCustomerIds,
  runMigration,
};

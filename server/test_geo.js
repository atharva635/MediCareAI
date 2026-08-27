import mongoose from "mongoose";
import User from "./models/User.js";
import { checkDoctorAvailability } from "./utils/timeHelper.js";

const MONGODB_URI = "mongodb+srv://medicareadmin:helloadminji@cluster0.3fu7wyw.mongodb.net/medicareAI?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Let's first print all doctors
    const allDoctors = await User.find({ role: "doctor" });
    console.log(`Total doctors in DB: ${allDoctors.length}`);
    for (const doc of allDoctors) {
      console.log(`- Doctor: ${doc.fullName}, isOnline: ${doc.isOnline}, location:`, doc.location);
      console.log(`  availability:`, doc.availability);
      console.log(`  isAvailableNow:`, checkDoctorAvailability(doc.availability));
    }

    // Now let's try the aggregation query near Rajesh Prasad's coordinates
    const lat = 28.7546;
    const lng = 77.4945;
    console.log(`Running aggregation near lat: ${lat}, lng: ${lng}...`);

    const aggregated = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 50000,
          query: {
            role: "doctor",
          },
        },
      },
      {
        $project: {
          password: 0,
        },
      },
    ]);

    console.log(`Aggregation returned ${aggregated.length} doctors:`);
    for (const doc of aggregated) {
      console.log(`- Aggregated Doctor: ${doc.fullName}, distance: ${doc.distance}m`);
      console.log(`  availability:`, doc.availability);
      console.log(`  isAvailableNow:`, checkDoctorAvailability(doc.availability));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error running test:", err);
  }
}

run();

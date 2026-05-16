// import Category from "../models/category"

// const categories = [
//     { name: "Music", description: "Concerts and music events", icon: "music", colorCode: "#FF3B30" },
//     { name: "Tech", description: "Technology and innovation events", icon: "cpu", colorCode: "#007AFF" },
//     { name: "Gaming", description: "Gaming and esports events", icon: "gamepad", colorCode: "#34C759" },
//     { name: "Sports", description: "Athletic and sporting events", icon: "award", colorCode: "#FF9500" },
//     { name: "Education", description: "Workshops and learning opportunities", icon: "book-open", colorCode: "#5856D6" },
//     { name: "Networking", description: "Professional networking events", icon: "users", colorCode: "#AF52DE" },
//     { name: "Comedy", description: "Stand-up and comedy shows", icon: "smile", colorCode: "#FF2D55" },
//     { name: "Fitness", description: "Health and wellness activities", icon: "activity", colorCode: "#30B0C7" },
//     { name: "Food & Drinks", description: "Culinary and dining experiences", icon: "coffee", colorCode: "#A2845E" },
//     { name: "Art", description: "Exhibitions and creative showcases", icon: "image", colorCode: "#FFCC00" },
//     { name: "Movies", description: "Film screenings and premieres", icon: "film", colorCode: "#8E8E93" },
//     { name: "Travel", description: "Tours and travel adventures", icon: "map", colorCode: "#5AC8FA" },
//     { name: "Community", description: "Local community gatherings", icon: "heart", colorCode: "#FF3B30" },
//     { name: "Festivals", description: "Large scale cultural celebrations", icon: "sun", colorCode: "#FF9500" },
//     { name: "Virtual Events", description: "Online webinars and meetups", icon: "video", colorCode: "#007AFF" }
// ]

// export const seedCategories = async () => {
//     try {
//         // Optimization: Use a loop to check and create missing categories
//         for (const category of categories) {
//             const exists = await Category.findOne({ name: category.name })

//             if (!exists) {
//                 await Category.create(category)
//                 console.log(`Created category: ${category.name}`)
//             }
//         }

//         console.log("Categories seeding process complete")
//     } catch (error) {
//         console.error("Error seeding categories:", error)
//     }
// }
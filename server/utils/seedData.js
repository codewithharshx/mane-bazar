const fs = require('fs');
const path = require('path');
const Category = require("../models/Category");
const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const User = require("../models/User");

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stockForIndex = (index) => 20 + ((index * 17) % 181);

const categorySeeds = [
  { name: "Rice & Grains", urlKey: "rice-grains", icon: "grain", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400" },
  { name: "Atta & Flour", urlKey: "atta-flour", icon: "wheat", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400" },
  { name: "Pulses & Dal", urlKey: "pulses-dal", icon: "beans", image: "https://images.unsplash.com/photo-1600626337887-21a8cd34842a?auto=format&fit=crop&q=80&w=400" },
  { name: "Cooking Oil & Ghee", urlKey: "cooking-oil-ghee", icon: "droplet", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400" },
  { name: "Spices & Masala", urlKey: "spices-masala", icon: "pepper", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400" },
  { name: "Packaged Foods", urlKey: "packaged-foods", icon: "package", image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=400" },
  { name: "Snacks & Biscuits", urlKey: "snacks-biscuits", icon: "cookie", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&q=80&w=400" },
  { name: "Beverages", urlKey: "beverages", icon: "cup-soda", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400" },
  { name: "Dairy Products", urlKey: "dairy-products", icon: "milk", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400" },
  { name: "Dry Fruits & Nuts", urlKey: "dry-fruits-nuts", icon: "nut", image: "https://images.unsplash.com/photo-1599557434557-418ca100b21a?auto=format&fit=crop&q=80&w=400" },
  { name: "Household Essentials", urlKey: "household-essentials", icon: "home", image: "https://images.unsplash.com/photo-1584824486516-0555a07fc511?auto=format&fit=crop&q=80&w=400" },
  { name: "Personal Care", urlKey: "personal-care", icon: "sparkles", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=400" }
];

const productBlueprints = [
  { category: "rice-grains", items: [["India Gate Basmati Rice 5kg", "India Gate", 699, 799, ["basmati", "premium", "rice"]], ["Sona Masoori Rice 5kg", "24 Mantra", 445, 520, ["sona masoori", "daily", "rice"]], ["Aval Poha Thick 1kg", "Tata Sampann", 79, 95, ["poha", "breakfast", "flattened rice"]], ["Fine Rava Semolina 1kg", "Pillsbury", 62, 72, ["semolina", "rava", "upma"]], ["Brown Rice 1kg", "Daawat", 129, 149, ["brown rice", "healthy", "grains"]]] },
  { category: "atta-flour", items: [["Aashirvaad Whole Wheat Atta 5kg", "Aashirvaad", 289, 335, ["atta", "wheat flour", "chapati"]], ["Fortune Chakki Fresh Atta 5kg", "Fortune", 275, 320, ["atta", "fresh", "roti"]], ["Besan Gram Flour 1kg", "Tata Sampann", 108, 125, ["besan", "gram flour", "pakora"]], ["Maida Refined Flour 1kg", "Pillsbury", 68, 80, ["maida", "baking", "refined flour"]], ["Ragi Flour 500g", "24 Mantra", 74, 90, ["ragi", "millet", "healthy flour"]]] },
  { category: "pulses-dal", items: [["Toor Dal 1kg", "Tata Sampann", 164, 185, ["toor dal", "arhar", "protein"]], ["Moong Dal 1kg", "Fortune", 138, 158, ["moong dal", "yellow dal", "protein"]], ["Chana Dal 1kg", "BB Royal", 92, 108, ["chana dal", "dal", "lentils"]], ["Rajma Chitra 1kg", "Organic Tattva", 152, 175, ["rajma", "beans", "kidney beans"]], ["Kabuli Chana 1kg", "Tata Sampann", 140, 162, ["kabuli chana", "chickpeas", "protein"]]] },
  { category: "cooking-oil-ghee", items: [["Saffola Gold Oil 1L", "Saffola", 189, 220, ["oil", "heart care", "refined"]], ["Fortune Sunlite Oil 1L", "Fortune", 162, 190, ["sunflower oil", "cooking oil"]], ["Amul Pure Ghee 1L", "Amul", 679, 755, ["ghee", "desi ghee", "pure"]], ["Parachute Coconut Oil 500ml", "Parachute", 198, 225, ["coconut oil", "cooking", "multipurpose"]], ["Dhara Mustard Oil 1L", "Dhara", 186, 210, ["mustard oil", "kachi ghani", "cooking"]]] },
  { category: "spices-masala", items: [["MDH Garam Masala 100g", "MDH", 82, 95, ["garam masala", "spices"]], ["Everest Turmeric Powder 200g", "Everest", 56, 65, ["turmeric", "haldi"]], ["Tata Salt 1kg", "Tata", 28, 32, ["salt", "iodized"]], ["Red Chilli Powder 200g", "Aachi", 74, 88, ["red chilli", "spice"]], ["Coriander Powder 200g", "Catch", 68, 78, ["coriander", "dhania powder"]]] },
  { category: "packaged-foods", items: [["Maggi 2-Minute Noodles 12 Pack", "Maggi", 168, 180, ["noodles", "instant food"]], ["MTR Ready To Eat Rajma Chawal", "MTR", 98, 115, ["ready meal", "rajma chawal"]], ["Haldiram Moong Dal Namkeen 400g", "Haldiram", 118, 135, ["namkeen", "packaged"]], ["Kellogg's Corn Flakes 875g", "Kellogg's", 359, 399, ["breakfast cereal", "corn flakes"]], ["Top Ramen Curry Noodles 6 Pack", "Top Ramen", 88, 102, ["ramen", "instant noodles"]]] },
  { category: "snacks-biscuits", items: [["Parle-G Gold Biscuits 1kg", "Parle", 142, 160, ["biscuits", "tea snack"]], ["Oreo Vanilla Creme Pack", "Oreo", 38, 45, ["oreo", "cookies"]], ["Lay's Magic Masala 82g", "Lay's", 46, 50, ["chips", "snacks"]], ["Kurkure Masala Munch 90g", "Kurkure", 22, 25, ["kurkure", "snacks"]], ["Britannia Good Day Butter 600g", "Britannia", 138, 155, ["good day", "biscuits"]]] },
  { category: "beverages", items: [["Tata Tea Gold 500g", "Tata Tea", 298, 335, ["tea", "leaf tea"]], ["Nescafe Classic 200g", "Nescafe", 345, 379, ["coffee", "instant coffee"]], ["Bru Instant Coffee 100g", "Bru", 188, 215, ["coffee", "bru"]], ["Pepsi PET Bottle 2.25L", "Pepsi", 99, 110, ["soft drink", "cola"]], ["Real Mixed Fruit Juice 1L", "Real", 122, 135, ["juice", "fruit drink"]]] },
  { category: "dairy-products", items: [["Amul Taaza Milk 1L", "Amul", 68, 72, ["milk", "dairy"]], ["Amul Fresh Curd 400g", "Amul", 42, 48, ["curd", "dahi"]], ["Amul Paneer 200g", "Amul", 92, 102, ["paneer", "protein"]], ["Amul Butter 500g", "Amul", 292, 320, ["butter", "salted"]], ["Amul Cheese Slices 200g", "Amul", 128, 142, ["cheese", "slices"]]] },
  { category: "dry-fruits-nuts", items: [["Whole Cashews 500g", "Nutraj", 448, 520, ["cashews", "dry fruits"]], ["California Almonds 500g", "Happilo", 429, 499, ["almonds", "nuts"]], ["Raisins Premium 250g", "Tulsi", 118, 136, ["raisins", "kishmish"]], ["Pistachios Roasted 250g", "Happilo", 298, 345, ["pistachios", "nuts"]], ["Walnut Kernels 250g", "Nutraj", 312, 360, ["walnuts", "brain food"]]] },
  { category: "household-essentials", items: [["Surf Excel Easy Wash 1kg", "Surf Excel", 238, 265, ["detergent", "laundry"]], ["Vim Dishwash Gel 750ml", "Vim", 168, 185, ["dishwash", "kitchen care"]], ["Harpic Toilet Cleaner 1L", "Harpic", 188, 210, ["toilet cleaner", "bathroom"]], ["Lizol Citrus Floor Cleaner 1L", "Lizol", 176, 198, ["floor cleaner", "disinfectant"]], ["Colin Glass Cleaner 500ml", "Colin", 96, 110, ["glass cleaner", "home care"]]] },
  { category: "personal-care", items: [["Dove Cream Beauty Bathing Bar 4 Pack", "Dove", 224, 260, ["soap", "beauty bar"]], ["Head & Shoulders Anti Dandruff Shampoo 340ml", "Head & Shoulders", 298, 340, ["shampoo", "anti dandruff"]], ["Colgate Strong Teeth Toothpaste 500g", "Colgate", 189, 215, ["toothpaste", "oral care"]], ["Vaseline Deep Moisture Lotion 400ml", "Vaseline", 268, 299, ["body lotion", "moisturizer"]], ["Pears Pure And Gentle Soap 3 Pack", "Pears", 142, 165, ["soap", "glycerine"]]] }
];

const couponSeeds = [
  { code: "WELCOME50", discountType: "flat", discountValue: 50, minOrderAmount: 499, maxUses: 200, usedCount: 0, expiresAt: new Date("2027-12-31"), isActive: true },
  { code: "FRESH10", discountType: "percent", discountValue: 10, minOrderAmount: 799, maxUses: 300, usedCount: 0, expiresAt: new Date("2027-12-31"), isActive: true },
  { code: "SAVE25", discountType: "flat", discountValue: 25, minOrderAmount: 299, maxUses: 500, usedCount: 0, expiresAt: new Date("2027-12-31"), isActive: true }
];

const catJSONMap = {
  "Rice": "rice-grains",
  "Spices": "spices-masala",
  "Pulses & Grains": "pulses-dal",
  "Packaged Foods": "packaged-foods",
  "Dairy & Bakery": "dairy-products",
  "Beverages": "beverages",
  "Snacks": "snacks-biscuits",
  "Oils & Ghee": "cooking-oil-ghee"
};

const createProductSeeds = (categoryMap) => {
  const items = [];
  const datasetPath = path.join(__dirname, '..', 'data', 'catalog.seed.json');
  
  if (fs.existsSync(datasetPath)) {
    const rawData = fs.readFileSync(datasetPath);
    const jsonItems = JSON.parse(rawData);
    
    const premiumImages = [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1600626337887-21a8cd34842a?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1599557434557-418ca100b21a?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1584824486516-0555a07fc511?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1596647321528-91d6ceda287c?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1550928431-ee0ec6db30d3?auto=format&fit=crop&q=80&w=400"
    ];

    jsonItems.forEach((item, index) => {
      const mappedSlug = catJSONMap[item.category] || "packaged-foods";
      const catId = categoryMap.get(mappedSlug);
      
      const hasDiscount = index % 3 !== 0;
      const discount = hasDiscount ? 5 + ((index * 7) % 30) : 0; 
      const mrp = discount > 0 ? Math.round(item.price / (1 - discount / 100)) : item.price;
      
      const dynImage = premiumImages[index % premiumImages.length];
      
      items.push({
        name: item.name,
        brand: item.brand,
        category: catId,
        urlKey: slugify(item.name) + "-" + index,
        price: item.price,
        mrp: mrp,
        discount: discount,
        stock: item.stock,
        lowStockThreshold: 10,
        image: dynImage,
        images: [dynImage],
        description: `${item.name} from ${item.brand} available in ${item.unit} packaging. High quality delivered straight to your door.`,
        tags: [item.category.toLowerCase(), "premium"],
        isActive: true
      });
    });
  } else {
    console.warn("catalog.seed.json not found. Returning empty products array.");
  }

  return items;
};

const clearDatabase = async () => {
  await Promise.all([
    User.deleteMany(),
    Category.deleteMany(),
    Product.deleteMany(),
    Coupon.deleteMany()
  ]);
};

const seedDatabase = async ({ clearExisting = true } = {}) => {
  if (clearExisting) {
    await clearDatabase();
  }

  const categories = await Category.insertMany(categorySeeds);
  const categoryMap = new Map(categories.map((category) => [category.urlKey, category._id]));

  await Coupon.insertMany(couponSeeds);

  await User.create({
    name: "Mane Bazar Admin",
    email: "admin@manebazar.com",
    password: "Admin@123",
    role: "admin",
    addresses: [
      {
        label: "Store",
        fullName: "Mane Bazar Admin",
        phoneNumber: "9876543210",
        addressLine1: "Kasegaon Main Road",
        addressLine2: "",
        city: "Kasegaon, Sangli",
        state: "Maharashtra",
        pincode: "415404",
        landmark: "Near Market",
        isDefault: true
      }
    ]
  });

  await Product.insertMany(createProductSeeds(categoryMap));
};

const ensureSeeded = async () => {
  const hasProducts = await Product.exists({});

  if (!hasProducts) {
    await seedDatabase({ clearExisting: false });
  }
  console.log("✅ Database seed check complete.");
};

module.exports = {
  seedDatabase,
  ensureSeeded
};

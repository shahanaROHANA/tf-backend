import mongoose from 'mongoose';
import Restaurant from './src/models/restaurantModel.js';
import Product from './src/models/productModel.js';
import dotenv from 'dotenv';

dotenv.config();

const stationData = {
  'Kilinochchi': [
    {
      name: 'Bharathi Hotel',
      cuisineType: 'Veg',
      description: 'Pure vegetarian restaurant',
      menuItems: [
        { name: 'Veg Kottu', price: 350, description: 'Mixed vegetable kottu', category: 'Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        { name: 'Veg Biriyani', price: 500, description: 'Vegetable biriyani with raita', category: 'Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
        { name: 'Veg Rice', price: 350, description: 'Steamed vegetables with rice', category: 'Veg', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
        { name: 'Rice & Curry', price: 250, description: 'Traditional rice with vegetable curry', category: 'Veg', image: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=400' },
        { name: 'Roll', price: 60, description: 'Vegetable roll', category: 'Veg', image: 'https://images.unsplash.com/photo-1601050690597-9f9d4ee9b1c7?w=400' },
        { name: 'Samosa', price: 80, description: 'Crispy vegetable samosa', category: 'Veg', image: 'https://images.unsplash.com/photo-1604908554007-269fd1b47c86?w=400' },
        { name: 'Parota', price: 50, description: 'Flaky parota with curry', category: 'Veg', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' }
      ]
    },
    {
      name: 'WhiteStone',
      cuisineType: 'Non-Veg',
      description: 'Non-vegetarian specialties',
      menuItems: [
        { name: 'Chicken Kottu', price: 650, description: 'Spicy chicken kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        { name: 'Mutton Kottu', price: 1000, description: 'Tender mutton kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1604908553826-16b7f14b1699?w=400' },
        { name: 'Seafood Kottu', price: 850, description: 'Mixed seafood kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'Chicken Biriyani', price: 1200, description: 'Aromatic chicken biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Mutton Biriyani', price: 1550, description: 'Rich mutton biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
        { name: 'Dum Biriyani', price: 1100, description: 'Special dum biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
        { name: 'Chicken Fried Rice', price: 800, description: 'Sizzling chicken fried rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' }
      ]
    },
    {
      name: 'Hari Milk Soda',
      cuisineType: 'Beverages',
      description: 'Fresh milk soda varieties',
      menuItems: [
        { name: 'Grapes Milk Soda', price: 250, description: 'Refreshing grapes milk soda', category: 'Veg', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400' },
        { name: 'Dates Milk Soda', price: 250, description: 'Sweet dates milk soda', category: 'Veg', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400' },
        { name: 'Badam Milk Soda', price: 300, description: 'Nutty badam milk soda', category: 'Veg', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400' }
      ]
    },
    {
      name: 'Phoenix',
      cuisineType: 'Non-Veg',
      description: 'Multi-cuisine restaurant',
      menuItems: [
        { name: 'Chicken Kottu', price: 800, description: 'Phoenix special chicken kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        { name: 'Mutton Kottu', price: 1400, description: 'Phoenix special mutton kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1604908553826-16b7f14b1699?w=400' },
        { name: 'Seafood Kottu', price: 1250, description: 'Phoenix seafood kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'Chicken Biriyani', price: 1200, description: 'Phoenix chicken biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Mutton Biriyani', price: 1600, description: 'Phoenix mutton biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
        { name: 'Dum Biriyani', price: 1200, description: 'Phoenix dum biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
        { name: 'Chicken Fried Rice', price: 1000, description: 'Phoenix chicken fried rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' }
      ]
    },
    {
      name: 'Sakthi Veg Restaurant',
      cuisineType: 'Veg',
      description: 'Pure vegetarian delights',
      menuItems: [
        { name: 'Dosa', price: 100, description: 'Crispy south Indian dosa', category: 'Veg', image: 'https://images.unsplash.com/photo-1566650554919-44ec743110d4?w=400' },
        { name: 'Parota', price: 50, description: 'Soft flaky parota', category: 'Veg', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' },
        { name: 'Idiyappam', price: 40, description: 'String hoppers with curry', category: 'Veg', image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400' },
        { name: 'Rotti', price: 60, description: 'Sri Lankan rotti', category: 'Veg', image: 'https://images.unsplash.com/photo-1601050690597-9f9d4ee9b1c7?w=400' },
        { name: 'Noodles', price: 250, description: 'Vegetable noodles', category: 'Veg', image: 'https://images.unsplash.com/photo-1617195737491-4e84d4c3418b?w=400' }
      ]
    },
    {
      name: 'KKJ Restaurant',
      cuisineType: 'Mixed',
      description: 'Multi-cuisine restaurant',
      menuItems: [
        { name: 'Chicken Kottu', price: 800, description: 'KKJ special chicken kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        { name: 'Mutton Kottu', price: 1400, description: 'KKJ special mutton kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1604908553826-16b7f14b1699?w=400' },
        { name: 'Seafood Kottu', price: 1500, description: 'KKJ seafood kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'Roll', price: 80, description: 'KKJ special roll', category: 'Veg', image: 'https://images.unsplash.com/photo-1601050690597-9f9d4ee9b1c7?w=400' },
        { name: 'Chicken Fried Rice', price: 950, description: 'KKJ chicken fried rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' }
      ]
    },
    {
      name: 'Pizza Cut',
      cuisineType: 'Pizza',
      description: 'Pizza specialists',
      menuItems: [
        { name: 'Margherita Pizza', price: 950, description: 'Classic margherita pizza', category: 'Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' },
        { name: 'Pepperoni Pizza', price: 1150, description: 'Spicy pepperoni pizza', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
        { name: 'Veggie Pizza', price: 880, description: 'Loaded vegetable pizza', category: 'Veg', image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400' },
        { name: 'Chicken Pizza', price: 1250, description: 'Chicken topping pizza', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd3?w=400' },
        { name: 'Seafood Pizza', price: 1350, description: 'Seafood special pizza', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?w=400' }
      ]
    }
  ],
  'Kodikamam': [
    {
      name: 'Star Kitchen',
      cuisineType: 'Mixed',
      description: 'Local cuisine specialties',
      menuItems: [
        { name: 'Rice & Curry', price: 250, description: 'Local style rice and curry', category: 'Veg', image: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=400' },
        { name: 'Chicken Rice', price: 750, description: 'Chicken with rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
        { name: 'Vegetable Noodles', price: 300, description: 'Stir fried vegetable noodles', category: 'Veg', image: 'https://images.unsplash.com/photo-1617195737491-4e84d4c3418b?w=400' }
      ]
    },
    {
      name: 'Nadsathira Restaurant',
      cuisineType: 'Mixed',
      description: 'Multi-cuisine restaurant',
      menuItems: [
        { name: 'Chicken Kottu', price: 800, description: 'Nadsathira special chicken kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        { name: 'Mutton Kottu', price: 1400, description: 'Nadsathira special mutton kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1604908553826-16b7f14b1699?w=400' },
        { name: 'Seafood Kottu', price: 1500, description: 'Nadsathiraseafood kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'CHICKEN NOODLES', price: 550, description: ' Nadsathiraspecial NOODLES', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1617195737491-4e84d4c3418b?w=400' },
        { name: 'Chicken Fried Rice', price: 950, description: 'Nadsathira chicken fried rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' }
      ]
    },
    {
      name: 'Kuputhu Family Restaurant',
      cuisineType: 'Mixed',
      description: 'Family-style restaurant with authentic Sri Lankan and South Indian cuisine',
      menuItems: [
        { name: 'Chicken Kottu', price: 750, description: 'Freshly made chicken kottu with aromatic spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Mutton Kottu', price: 1200, description: 'Tender mutton pieces with flaky kottu roti', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
        { name: 'Vegetable Kottu', price: 550, description: 'Mixed vegetables with traditional kottu roti', category: 'Veg', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400' },
        { name: 'Chicken Biriyani', price: 850, description: 'Fragrant basmati rice with spiced chicken', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Mutton Biriyani', price: 1350, description: 'Rich mutton biriyani with aromatic spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
        { name: 'Vegetable Biriyani', price: 650, description: 'Mixed vegetables with fragrant basmati rice', category: 'Veg', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400' },
        { name: 'Chicken Fried Rice', price: 700, description: 'Wok-tossed rice with chicken and vegetables', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' },
        { name: 'Dosa', price: 120, description: 'Crispy South Indian dosa with sambar', category: 'Veg', image: 'https://images.unsplash.com/photo-1566650554919-44ec743110d4?w=400' },
        { name: 'Parota', price: 80, description: 'Soft flaky parota with vegetable curry', category: 'Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Fish Curry', price: 900, description: 'Fresh fish curry with coconut milk', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
        { name: 'Coconut Rice', price: 400, description: 'Fragrant rice cooked with fresh coconut', category: 'Veg', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400' },
        { name: 'Hoppers', price: 350, description: 'Traditional Sri Lankan hoppers with egg', category: 'Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' }
      ]
    },


  ],
  'Meesalai': [
    {
      name: 'BIRUNTHAVANAM Hotel',
      cuisineType: 'Mixed',
      description: 'Food specialists',
      menuItems: [
        { name: 'Chicken kottu', price: 800, description: 'Aromatic chicken kottu', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Veg Biryani', price: 600, description: 'Vegetable biryani', category: 'Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
        { name: 'Veg Rice', price: 450, description: 'Vegetable Rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' }
      ]
    }
  ],
  'Sangaththanai': [
    {
      name: 'Mohan Cafe',
      cuisineType: 'Mixed',
      description: 'Cozy cafe',
      menuItems: [
        
        { name: 'Tea', price: 5000, description: 'Hot Ceylon tea', category: 'Veg', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400' },
        { name: 'Donuts', price: 8000, description: 'donuts', category: 'Veg', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400' }
      ]
    },
    {
      name: 'NKD Restaurant',
      cuisineType: 'Mixed',
      description: 'Contemporary restaurant with fusion cuisine and traditional favorites',
      menuItems: [
        { name: 'NKD Special Kottu', price: 850, description: 'House special kottu with secret spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        
        { name: 'NKD Mutton Biriyani', price: 1450, description: 'Premium mutton biriyani with traditional spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
        { name: 'NKD Vegetable Biriyani', price: 750, description: 'Mixed vegetables with aromatic basmati rice', category: 'Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
      
        
        
        { name: 'NKD Fish Curry', price: 1050, description: 'Fresh fish curry with coconut milk and curry leaves', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
        
        
        
        
        { name: 'NKD Idiyappam', price: 180, description: 'String hoppers with coconut milk and curry', category: 'Veg', image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400' }
      ] 
    }
  ],
  'Chavakachcheri': [
    {
      name: 'Arul Restaurant',
      cuisineType: 'Mixed',
      description: 'Traditional Sri Lankan cuisine with modern touch',
      menuItems: [
        { name: 'Chicken Kottu', price: 850, description: 'Arul special chicken kottu with secret spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        
        { name: 'Vegetable Kottu', price: 650, description: 'Fresh vegetables with traditional kottu roti', category: 'Veg', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400' },
        
        { name: 'Mutton Biriyani', price: 1450, description: 'Rich mutton biriyani with aromatic spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
        { name: 'Vegetable Biriyani', price: 750, description: 'Mixed vegetables with fragrant basmati rice', category: 'Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' }
      ]
    },
    {
      name: 'Lovely Cream House',
      cuisineType: 'Mixed',
      description: 'Ice cream, desserts and sweet treats',
      menuItems: [
        
        { name: 'Chocolate Ice Cream', price: 250, description: 'Rich chocolate ice cream', category: 'Veg', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400' },
        { name: 'Strawberry Ice Cream', price: 250, description: 'Fresh strawberry ice cream', category: 'Veg', image: 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?w=400' },
        { name: 'Chocolate Cake', price: 350, description: 'Moist chocolate layer cake', category: 'Veg', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
        
        { name: 'Mango Lassi', price: 180, description: 'Refreshing mango yogurt drink', category: 'Veg', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400' }
      ]
    },
    {
      name: 'KFC',
      cuisineType: 'Mixed',
      description: 'Finger lickin good fried chicken',
      menuItems: [
        { name: 'Chicken Bucket', price: 1200, description: 'Crispy fried chicken bucket', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        
        { name: 'Chicken Burger', price: 350, description: 'Crispy chicken burger with lettuce', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400' },
        { name: 'French Fries', price: 200, description: 'Crispy golden french fries', category: 'Veg', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' }
        
      ]
    },
    {
      name: 'KBC',
      cuisineType: 'Mixed',
      description: 'Kitchen by Chavakachcheri - local favorites with BBQ specialties',
      menuItems: [
        { name: 'KBC Special Kottu', price: 800, description: 'KBC signature kottu special', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        
        { name: 'KBC Mutton Biriyani', price: 1400, description: 'Premium mutton biriyani', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
        { name: 'KBC Vegetable Biriyani', price: 700, description: 'Mixed vegetable biriyani', category: 'Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
        { name: 'BBQ Chicken', price: 950, description: 'Grilled chicken with special BBQ sauce', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1539636794215-90f6f3e3cd5b?w=400' },
        { name: 'BBQ Pork Ribs', price: 1250, description: 'Tender pork ribs with smoky BBQ glaze', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
        { name: 'BBQ Fish', price: 1100, description: 'Fresh fish grilled with aromatic BBQ spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
        { name: 'BBQ Prawns', price: 1300, description: 'Juicy prawns marinated and grilled to perfection', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'BBQ Mutton', price: 1450, description: 'Premium mutton pieces with signature BBQ rub', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1604908553826-16b7f14b1699?w=400' },
        { name: 'BBQ Vegetable Platter', price: 850, description: 'Mixed vegetables grilled with BBQ seasoning', category: 'Veg', image: 'https://images.unsplash.com/photo-1506318164473-2e7877d06fbb?w=400' },
        { name: 'BBQ Chicken Wings', price: 750, description: 'Spicy BBQ chicken wings with dipping sauce', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' }
      ]
    },
    {
      name: 'Jaffna Kitchen',
      cuisineType: 'Mixed',
      description: 'Authentic Jaffna-style cuisine and flavors',
      menuItems: [
        { name: 'Jaffna Kottu', price: 900, description: 'Traditional Jaffna kottu with unique spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400' },
        { name: 'Jaffna Biriyani', price: 1100, description: 'Authentic Jaffna biriyani with spices', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Jaffna Mutton Curry', price: 1300, description: 'Slow-cooked mutton curry', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1604908553826-16b7f14b1699?w=400' },
        { name: 'Jaffna Prawn Curry', price: 1200, description: 'Spicy prawn curry with coconut', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'Jaffna Fried Rice', price: 850, description: 'Jaffna-style fried rice', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' },
        { name: 'Jaffna Crab Curry', price: 1600, description: 'Fresh crab in spicy curry', category: 'Non-Veg', image: 'https://images.unsplash.com/photo-1476127396671-ec85c3a2f42a?w=400' },
        { name: 'Jaffna Hoppers', price: 400, description: 'Traditional Jaffna hoppers', category: 'Veg', image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400' },
        { name: 'Jaffna String Hoppers', price: 350, description: 'Steamed rice noodles', category: 'Veg', image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400' }
      ]
    }
  ]
};

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trainfood');
    
    console.log('Connected to MongoDB');
    
    // Clear existing restaurants and products
    await Restaurant.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create restaurants and products
    for (const [station, restaurants] of Object.entries(stationData)) {
      console.log(`\nProcessing station: ${station}`);
      
      for (const restaurantData of restaurants) {
        // Create restaurant
        const restaurant = await Restaurant.create({
          name: restaurantData.name,
          station: station,
          cuisineType: restaurantData.cuisineType,
          description: restaurantData.description,
          isActive: true
        });
        
        console.log(`Created restaurant: ${restaurant.name}`);
        
        // Create products for this restaurant
        for (const item of restaurantData.menuItems) {
          await Product.create({
            name: item.name,
            description: item.description,
            priceCents: item.price,
            available: true,
            station: station,
            restaurant: restaurant._id,
            category: item.category,
            imageUrl: item.image || null, // Use image URL if provided
            deliveryTimeEstimate: '30 mins'
          });
        }
        
        console.log(`Created ${restaurantData.menuItems.length} menu items for ${restaurant.name}`);
      }
    }
    
    console.log('\n✅ Database seeded successfully!');
    
    // Show summary
    const totalRestaurants = await Restaurant.countDocuments();
    const totalProducts = await Product.countDocuments();
    console.log(`\nSummary:`);
    console.log(`- Total Restaurants: ${totalRestaurants}`);
    console.log(`- Total Products: ${totalProducts}`);
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedData();

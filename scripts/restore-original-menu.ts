import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch 
} from 'firebase/firestore';
import fs from 'fs';
import config from '../firebase-applet-config.json' with { type: 'json' };

const ORIGINAL_CATEGORIES = [
  { id: 'cat-papadums', name: 'Papadums & Chutneys', order: 0 },
  { id: 'cat-starters', name: 'Starters', order: 1 },
  { id: 'cat-tandoori', name: 'Tandoori Dishes', order: 2 },
  { id: 'cat-chef-specials', name: 'Chef Specials', order: 3 },
  { id: 'cat-mughal-specials', name: 'Mughal Specialities', order: 4 },
  { id: 'cat-shaslick-bhoona', name: 'Shaslick Bhoona', order: 5 },
  { id: 'cat-masala', name: 'Masala Dishes', order: 6 },
  { id: 'cat-fish', name: 'Fish Dishes', order: 7 },
  { id: 'cat-karahi', name: 'Karahi Dishes', order: 8 },
  { id: 'cat-jalfrazi', name: 'Jalfrazi Dishes', order: 9 },
  { id: 'cat-balti', name: 'Balti Dishes', order: 10 },
  { id: 'cat-tawa', name: 'Tawa Dishes', order: 11 },
  { id: 'cat-traditional', name: 'Traditional Dishes', order: 12 },
  { id: 'cat-biryani', name: 'Biryani Dishes', order: 13 },
  { id: 'cat-vegetable', name: 'Vegetable Dishes', order: 14 },
  { id: 'cat-rice', name: 'Rice', order: 15 },
  { id: 'cat-breads', name: 'Naan & Tandoori Breads', order: 16 },
  { id: 'cat-english', name: 'English Dishes', order: 17 },
  { id: 'cat-drinks', name: 'Soft Drinks', order: 18 },
  { id: 'cat-set-meals', name: 'Set Meals', order: 19 },
];

const ORIGINAL_MEAT_OPTIONS = [
  { id: 'meat-chicken', name: 'Chicken', extra: 0, order: 0 },
  { id: 'meat-lamb', name: 'Lamb', extra: 1.00, order: 1 },
  { id: 'meat-chicken-tikka', name: 'Chicken Tikka', extra: 1.00, order: 2 },
  { id: 'meat-lamb-tikka', name: 'Lamb Tikka', extra: 2.00, order: 3 },
  { id: 'meat-prawn', name: 'Prawn', extra: 1.00, order: 4 },
  { id: 'meat-king-prawn', name: 'King Prawn', extra: 3.00, order: 5 },
  { id: 'meat-veg', name: 'Mixed Vegetables', extra: 0, order: 6 },
  { id: 'meat-quorn', name: 'Quorn', extra: 0, order: 7 },
];

// 14 Core Traditional Dishes (where meat option is selected at order time)
const TRADITIONAL_DISHES = [
  { id: 'jjsIadElwgPVVFzSQCrH', name: 'Korma (N)(D)', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Mild, sweet and rich dish cooked with coconut, fresh cream and almond powder.' },
  { id: 'j0sMrHndpfcVWQsGFcym', name: 'Dansak', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Sweet, sour and fairly hot curry cooked with lentils and pineapple.' },
  { id: 'tjemwqVekcDpZSc4UXI9', name: 'Rogan Josh', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Medium spiced dish topped with a rich tomato and pimento garnish.' },
  { id: 'hklklvd9aVoITmuLpdgF', name: 'Dupiaza', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Medium spiced curry cooked with generous chunks of seasoned fried onions and peppers.' },
  { id: 'W3XCDnPiyoCDV0249c0G', name: 'Vindaloo', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Very hot dish cooked with ground red chillies and potatoes for intense fiery flavour.' },
  { id: 'G30WVopd3sTgQqYSsnwI', name: 'Madras', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'A South Indian favourite, fairly hot and spicy curry with a squeeze of fresh lemon.' },
  { id: 'deDwD65VFv7ens9yVii5', name: 'Bhuna', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Thoroughly seasoned, rich semi-dry sauce reduced with tomatoes, onions and fragrant spices.' },
  { id: 'Wjdr8G9CGssE2WgRZh7g', name: 'Saagwala', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Medium hot curry cooked with fresh spinach, garlic and fragrant spices.' },
  { id: 'zqrCkOQoIzaPAuDbcVXq', name: 'Pathia', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Sweet, sour and hot tangy dish cooked with special oriental spices.' },
  { id: '74PWhtslPV40x2tNEPFM', name: 'Curry', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Classic medium sauce prepared with a rich blend of traditional spices.' },
  { id: 'jAdHzon9uOY6HtUgH86M', name: 'Methi', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Cooked with fenugreek leaves in a medium spicy thick sauce.' },
  { id: 'QmULL9JLsDiaYhLq6L2U', name: 'Phall', price: 11.45, category: 'Traditional Dishes', isTraditional: true, description: 'Extremely hot and fiery curry for the seasoned curry lover.' },
  { id: 'xoTxbjbcPGuyEvT762v5', name: 'Kashmir (D)', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Mild dish prepared with banana and lychees in a sweet creamy sauce.' },
  { id: 'vi3UuqEwCWvF9EMgQNxi', name: 'Malaya', price: 10.95, category: 'Traditional Dishes', isTraditional: true, description: 'Mild curry prepared with pineapple and mild spices in a creamy sauce.' },
];

function assignCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('papadum') || n.includes('chutney') || n.includes('sauce') || n.includes('salad') || n.includes('pickles')) {
    return 'Papadums & Chutneys';
  }
  if (n.includes('tikka masala') || n.includes('masala')) {
    return 'Masala Dishes';
  }
  if (n.includes('shaslick bhoona')) {
    return 'Shaslick Bhoona';
  }
  if (n.includes('biryani')) {
    return 'Biryani Dishes';
  }
  if (n.includes('balti')) {
    return 'Balti Dishes';
  }
  if (n.includes('jalfrazi')) {
    return 'Jalfrazi Dishes';
  }
  if (n.includes('karahi')) {
    return 'Karahi Dishes';
  }
  if (n.includes('tawa')) {
    return 'Tawa Dishes';
  }
  if (n.includes('rice')) {
    return 'Rice';
  }
  if (n.includes('naan') || n.includes('paratha') || n.includes('chapati') || n.includes('roti') || n.includes('puri')) {
    if (n.includes('on puri')) return 'Starters';
    return 'Naan & Tandoori Breads';
  }
  if (n.includes('fish')) {
    return 'Fish Dishes';
  }
  if (n.includes('tandoori') || n.includes('shashlik')) {
    if (n.includes('(s)') || n.includes('samosa') || n.includes('pakora') || n.includes('kebab s')) return 'Starters';
    return 'Tandoori Dishes';
  }
  if (n.includes('samosa') || n.includes('pakora') || n.includes('kebab') || n.includes('(s)') || n.includes('butterfly') || n.includes('squid') || n.includes('puri')) {
    return 'Starters';
  }
  if (n.includes('dall') || n.includes('potato') || n.includes('aloo') || n.includes('bhaji') || n.includes('paneer') || n.includes('vegetables curry')) {
    return 'Vegetable Dishes';
  }
  if (n.includes('coke') || n.includes('pepper') || n.includes('fanta') || n.includes('water') || n.includes('drink')) {
    return 'Soft Drinks';
  }
  if (n.includes('chips') || n.includes('nuggets') || n.includes('strips') || n.includes('omelette')) {
    return 'English Dishes';
  }
  if (n.includes('raunds') || n.includes('nawabi') || n.includes('garlic chilli') || n.includes('butter chicken') || n.includes('lahore') || n.includes('sondia') || n.includes('pasanda') || n.includes('makhon') || n.includes('mughal masala') || n.includes('delight') || n.includes('revenge') || n.includes('achari') || n.includes('swadli')) {
    return 'Chef Specials';
  }
  return 'Mughal Specialities';
}

async function restore() {
  console.log('=== RESTORING ORIGINAL MUGHAL DYNASTY MENU IN FIRESTORE ===');
  const app = initializeApp(config);
  const auth = getAuth(app);
  const cred = await signInAnonymously(auth);
  const db = getFirestore(app, config.firestoreDatabaseId);

  // Set admin role for script execution
  await setDoc(doc(db, 'users', cred.user.uid), {
    name: 'Mughal Dynasty Restore Script',
    email: 'mughaldynastyrestaurant@gmail.com',
    role: 'admin',
  });
  console.log('Admin auth session active:', cred.user.uid);

  // 1. Clean current menu items in 'menu'
  const currentMenu = await getDocs(collection(db, 'menu'));
  console.log(`Deleting ${currentMenu.docs.length} items from 'menu'...`);
  const batchSize = 400;
  for (let i = 0; i < currentMenu.docs.length; i += batchSize) {
    const b = writeBatch(db);
    currentMenu.docs.slice(i, i + batchSize).forEach(d => b.delete(d.ref));
    await b.commit();
  }

  // 2. Clean current categories
  const currentCats = await getDocs(collection(db, 'categories'));
  console.log(`Deleting ${currentCats.docs.length} categories from 'categories'...`);
  for (let i = 0; i < currentCats.docs.length; i += batchSize) {
    const b = writeBatch(db);
    currentCats.docs.slice(i, i + batchSize).forEach(d => b.delete(d.ref));
    await b.commit();
  }

  // 3. Clean current meatOptions
  const currentMeats = await getDocs(collection(db, 'meatOptions'));
  console.log(`Deleting ${currentMeats.docs.length} meat options...`);
  for (let i = 0; i < currentMeats.docs.length; i += batchSize) {
    const b = writeBatch(db);
    currentMeats.docs.slice(i, i + batchSize).forEach(d => b.delete(d.ref));
    await b.commit();
  }

  // 4. Restore 20 Categories
  console.log(`Inserting ${ORIGINAL_CATEGORIES.length} original categories...`);
  const catBatch = writeBatch(db);
  for (const cat of ORIGINAL_CATEGORIES) {
    const ref = doc(db, 'categories', cat.id);
    catBatch.set(ref, {
      name: cat.name,
      order: cat.order,
      createdAt: new Date().toISOString(),
    });
  }
  await catBatch.commit();
  console.log('Original categories restored.');

  // 5. Restore 8 Meat Options
  console.log(`Inserting ${ORIGINAL_MEAT_OPTIONS.length} original meat options...`);
  const meatBatch = writeBatch(db);
  for (const meat of ORIGINAL_MEAT_OPTIONS) {
    const ref = doc(db, 'meatOptions', meat.id);
    meatBatch.set(ref, {
      name: meat.name,
      extra: meat.extra,
      order: meat.order,
      createdAt: new Date().toISOString(),
    });
  }
  await meatBatch.commit();
  console.log('Original meat options restored.');

  // 6. Restore Traditional Dishes
  console.log(`Inserting ${TRADITIONAL_DISHES.length} traditional dishes...`);
  const tradBatch = writeBatch(db);
  let orderIndex = 0;
  for (const td of TRADITIONAL_DISHES) {
    const ref = doc(db, 'menu', td.id);
    tradBatch.set(ref, {
      name: td.name,
      price: td.price,
      category: td.category,
      isTraditional: true,
      description: td.description,
      available: true,
      order: orderIndex++,
      createdAt: new Date().toISOString(),
    });
  }
  await tradBatch.commit();

  // 7. Restore Standalone Dishes from Orders
  const dishesFile = JSON.parse(fs.readFileSync('all-ordered-dishes.json', 'utf8'));
  const standaloneDishes = dishesFile.filter((d: any) => !d.id || !d.id.includes('-'));
  console.log(`Inserting ${standaloneDishes.length} standalone dishes...`);

  // Filter out any dummy stripe items if present
  const validDishes = standaloneDishes.filter((d: any) => !d.name.includes('Online Order (Paid via'));

  for (let i = 0; i < validDishes.length; i += batchSize) {
    const b = writeBatch(db);
    const chunk = validDishes.slice(i, i + batchSize);
    for (const d of chunk) {
      const docId = d.id || ('dish_' + Math.random().toString(36).substring(2, 9));
      const ref = doc(db, 'menu', docId);
      const cat = assignCategory(d.name);
      b.set(ref, {
        name: d.name,
        price: d.prices && d.prices.length > 0 ? d.prices[0] : 0,
        category: cat,
        isTraditional: false,
        description: '',
        available: true,
        order: orderIndex++,
        createdAt: new Date().toISOString(),
      });
    }
    await b.commit();
  }

  // 8. Verify final restore counts
  const finalMenu = await getDocs(collection(db, 'menu'));
  const finalCats = await getDocs(collection(db, 'categories'));
  const finalMeats = await getDocs(collection(db, 'meatOptions'));

  console.log('=== RESTORATION VERIFICATION ===');
  console.log(`Menu items in 'menu': ${finalMenu.docs.length}`);
  console.log(`Categories in 'categories': ${finalCats.docs.length}`);
  console.log(`Meat options in 'meatOptions': ${finalMeats.docs.length}`);
  console.log('=================================');
  process.exit(0);
}

restore().catch(err => {
  console.error('Restore error:', err);
  process.exit(1);
});

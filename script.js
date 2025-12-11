// =================== NAVBAR LOGO ===================
const navMenu = document.getElementById('navMenu');
const logo = document.querySelector('.navbar-brand');

navMenu.addEventListener('show.bs.collapse', () => (logo.style.display = 'none'));
navMenu.addEventListener('hide.bs.collapse', () => (logo.style.display = 'block'));

// =================== HELPER: LOGIN STATUS ===================
function isUserLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

// Small popup for restricted actions
function showLoginRequiredPopup() {
  const popup = $('<div class="login-required-popup">Please login to perform this action!</div>');
  $('body').append(popup);
  popup.css({
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    color: '#a12727',
    border: '2px solid #a12727',
    padding: '15px 30px',
    borderRadius: '10px',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    zIndex: '9999',
    display: 'none'
  });
  popup.fadeIn();
  setTimeout(() => popup.fadeOut(() => popup.remove()), 2000);
}

// =================== REVIEWS SLIDER ===================
let reviewIndex = 0;
const slider = document.getElementById("reviewSlider");
if (slider) {
  const reviews = slider.children.length;
  const visible = 4;

  function updateReviewSlider() {
    const cardWidth = slider.children[0].offsetWidth + 16;
    const maxScroll = reviews - visible;
    if (reviewIndex < 0) reviewIndex = 0;
    if (reviewIndex > maxScroll) reviewIndex = maxScroll;
    slider.style.transform = `translateX(-${reviewIndex * cardWidth}px)`;
  }

  $("#nextReview").click(() => { reviewIndex++; updateReviewSlider(); });
  $("#prevReview").click(() => { reviewIndex--; updateReviewSlider(); });
  window.addEventListener("resize", updateReviewSlider);
}

// =================== API & SEARCH ===================
const apiBase = "https://www.themealdb.com/api/json/v1/1/";

function showSpinner() { $('#loadingSpinner').removeClass('d-none'); }
function hideSpinner() { $('#loadingSpinner').addClass('d-none'); }

function renderRecipes(recipes) {
  $('#recipeResults').html('');
  recipes.forEach(meal => {
    const categoryBadge = meal.strCategory ? `<div class="category-badge">${meal.strCategory}</div>` : '';
    $('#recipeResults').append(`
      <div class="col-md-4 position-relative mb-4">
        ${categoryBadge}
        <div class="card" data-id="${meal.idMeal}">
          <img src="${meal.strMealThumb}" class="card-img-top">
          <div class="card-body">
            <h5 class="card-title">${meal.strMeal}</h5>
            <button class="btn view-btn" data-id="${meal.idMeal}">View Recipe</button>
          </div>
        </div>
      </div>
    `);
  });
}

function searchRecipes(query) {
  showSpinner();
  $.getJSON(apiBase + "search.php?s=" + query, function (data) {
    hideSpinner();
    if (data.meals) renderRecipes(data.meals);
    else $('#recipeResults').html('<p class="text-danger">No recipes found.</p>');
  });
}

function filterRecipes(type, value) {
  showSpinner();
  $.getJSON(apiBase + `filter.php?${type}=${value}`, function (data) {
    hideSpinner();
    if (data.meals) renderRecipes(data.meals);
    else $('#recipeResults').html('<p class="text-danger">No recipes found.</p>');
  });
}

// =================== DOCUMENT READY ===================
$(document).ready(function () {
  // Load filters
  $.getJSON(apiBase + "list.php?c=list", data => {
    data.meals.forEach(cat => $('#categoryFilter').append(`<option value="${cat.strCategory}">${cat.strCategory}</option>`));
  });

  $.getJSON(apiBase + "list.php?a=list", data => {
    data.meals.forEach(area => $('#areaFilter').append(`<option value="${area.strArea}">${area.strArea}</option>`));
  });

  // Trending recipes
  $.getJSON(apiBase + "search.php?s=", function (data) {
    const meals = data.meals.slice(0, 4);
    $('#trendingRecipes').html('');
    meals.forEach(meal => {
      $('#trendingRecipes').append(`
        <div class="col-md-3 mb-4">
          <div class="card h-100">
            <img src="${meal.strMealThumb}" class="card-img-top">
            <div class="card-body text-center">
              <h5 class="card-title">${meal.strMeal}</h5>
              <button class="btn btn-outline-primary view-btn" data-id="${meal.idMeal}">View Recipe</button>
            </div>
          </div>
        </div>
      `);
    });
  });

  // Search + Filter events
  $('#searchBtn').click(() => {
    const query = $('#searchInput').val().trim();
    if (query) searchRecipes(query);
  });

  $('#categoryFilter').change(function () {
    const category = $(this).val();
    if (category) filterRecipes("c", category);
  });

  $('#areaFilter').change(function () {
    const area = $(this).val();
    if (area) filterRecipes("a", area);
  });

  // =================== VIEW RECIPE MODAL ===================
  $(document).on('click', '.view-btn', function () {
    const id = $(this).data('id');
    $.getJSON(apiBase + "lookup.php?i=" + id, function (data) {
      const meal = data.meals[0];
  
      $('#recipeTitle').text(meal.strMeal);
      $('#recipeImg').attr('src', meal.strMealThumb);
  
      // INGREDIENTS setup
      originalIngredients = '';
      for (let i = 1; i <= 20; i++) {
        const ing = meal["strIngredient" + i];
        const measure = meal["strMeasure" + i];
        if (ing && ing.trim() !== "") {
          originalIngredients += `<li>${ing} - ${measure}</li>`;
        }
      }
      $('#ingredientList').html(originalIngredients);
  
      // Store and translate
      originalInstructions = meal.strInstructions;
      translatedInstructions = translateToUrdu(meal.strInstructions);
  
      // Translate ingredients too
      translatedIngredients = translateToUrdu(originalIngredients);
  
      $('#instructionsText').text(originalInstructions);
  
      // Like/Dislike setup
      $('#likeBtn').attr("data-id", meal.idMeal);
      $('#dislikeBtn').attr("data-id", meal.idMeal);
  
      const loggedIn = isUserLoggedIn();
      $('#likeBtn').prop('disabled', !loggedIn);
      $('#dislikeBtn').prop('disabled', !loggedIn);
  
      updateLikeDislikeDisplay(meal.idMeal);
  
      const modal = new bootstrap.Modal(document.getElementById('recipeModal'));
      modal.show();
  
      // Reset translation button text
      isUrdu = false;
      $('#translateBtn').text('Translate to Urdu');
    });
  });
  
});

// =================== LIKE / DISLIKE ===================
let recipeLikes = JSON.parse(localStorage.getItem("recipeLikes")) || {};
let recipeDislikes = JSON.parse(localStorage.getItem("recipeDislikes")) || {};

function updateLikeDislikeDisplay(recipeId) {
  $("#likeCount").text(recipeLikes[recipeId] || 0);
  $("#dislikeCount").text(recipeDislikes[recipeId] || 0);
}

$(document).on("click", "#likeBtn", function () {
  if (!isUserLoggedIn()) return showLoginRequiredPopup();
  const recipeId = $(this).data("id");
  recipeLikes[recipeId] = (recipeLikes[recipeId] || 0) + 1;
  localStorage.setItem("recipeLikes", JSON.stringify(recipeLikes));
  $("#likeCount").text(recipeLikes[recipeId]);
  $(this).prop("disabled", true);
  $("#dislikeBtn").prop("disabled", true);
});

$(document).on("click", "#dislikeBtn", function () {
  if (!isUserLoggedIn()) return showLoginRequiredPopup();
  const recipeId = $(this).data("id");
  recipeDislikes[recipeId] = (recipeDislikes[recipeId] || 0) + 1;
  localStorage.setItem("recipeDislikes", JSON.stringify(recipeDislikes));
  $("#dislikeCount").text(recipeDislikes[recipeId]);
  $(this).prop("disabled", true);
  $("#likeBtn").prop("disabled", true);
});

// =================== CATEGORY CARD CLICK EVENT ===================
$(document).on("click", ".category-card", function () {
  const category = $(this).data("category");
  if (category) {
    // Filter recipes by selected category
    filterRecipes("c", category);

    // Update dropdown selection to match the clicked card
    $("#categoryFilter").val(category);
  }
});

// =================== REVIEWS SYSTEM ===================
let reviewsData = JSON.parse(localStorage.getItem("recipeReviews")) || [];
let selectedRating = 0;

$(document).on("click", ".rating-stars i", function () {
  if (!isUserLoggedIn()) return showLoginRequiredPopup();
  selectedRating = $(this).data("value");
  $(".rating-stars i").removeClass("active");
  $(this).prevAll().addBack().addClass("active");
});

$(document).on("click", "#submitReview", function () {
  if (!isUserLoggedIn()) return showLoginRequiredPopup();

  const name = $("#reviewName").val().trim();
  const text = $("#reviewText").val().trim();
  const recipeId = $("#likeBtn").attr("data-id");
  const recipeTitle = $("#recipeTitle").text();

  if (!name || !selectedRating || !text) return alert("Please complete all fields!");

  const newReview = {
    id: Date.now(),
    recipeId,
    recipeTitle,
    name,
    rating: selectedRating,
    text,
    date: new Date().toLocaleString(),
  };

  reviewsData.push(newReview);
  localStorage.setItem("recipeReviews", JSON.stringify(reviewsData));

  $("#reviewName, #reviewText").val("");
  $(".rating-stars i").removeClass("active");
  selectedRating = 0;

  const popup = document.getElementById("reviewPopup");
  popup.style.display = "block";
  setTimeout(() => popup.classList.add("show"), 10);
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => popup.style.display = "none", 300);
  }, 2500);
});

// =================== LOGIN SYSTEM ===================
const savedEmail = "test@example.com";
const savedPassword = "12345";

function showSignUp() {
  document.getElementById("loginPopupOverlay").classList.add("signup-mode");
}
function showLogin() {
  document.getElementById("loginPopupOverlay").classList.remove("signup-mode");
}

document.addEventListener("DOMContentLoaded", () => {
  const loginPopup = document.getElementById("loginPopupOverlay");
  const openBtn = document.getElementById("openLoginPopup");
  const loginBtn = document.getElementById("loginSubmit");

  openBtn.addEventListener("click", () => (loginPopup.style.display = "flex"));
  loginPopup.addEventListener("click", (e) => {
    if (e.target.id === "loginPopupOverlay") loginPopup.style.display = "none";
  });

  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    if (email === savedEmail && password === savedPassword) {
      localStorage.setItem("isLoggedIn", "true");
      showSuccessPopup();
    } else showInvalidPopup();
  });
});

function showSuccessPopup() {
  const successPopup = document.getElementById("successPopup");
  const overlay = document.getElementById("loginPopupOverlay");
  document.getElementById("logoutBtn").style.display = "inline-block";
  document.getElementById("openLoginPopup").style.display = "none";
  successPopup.style.display = "block";
  setTimeout(() => {
    successPopup.style.display = "none";
    overlay.style.display = "none";
  }, 2000);
}

function showInvalidPopup() {
  const invalidPopup = document.getElementById("invalidPopup");
  invalidPopup.style.display = "block";
  setTimeout(() => (invalidPopup.style.display = "none"), 2000);
}

// =================== LOGOUT SYSTEM ===================
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("openLoginPopup");

  // Check login status on page load
  if (localStorage.getItem("isLoggedIn") === "true") {
    logoutBtn.style.display = "inline-block";
    loginBtn.style.display = "none";
  }

  // Logout click event
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("isLoggedIn");

    // Hide logout, show login again
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";

    // Optional: show confirmation popup
    const popup = document.createElement("div");
    popup.textContent = "Logged out successfully!";
    Object.assign(popup.style, {
      position: "fixed",
      top: "40%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "#fff",
      border: "2px solid #a12727",
      padding: "15px 30px",
      borderRadius: "10px",
      color: "#a12727",
      fontWeight: "600",
      zIndex: "9999",
      boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
    });
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2000);
  });
});


// Translate helpers
let isUrdu = false;
let originalInstructions = '';
let translatedInstructions = '';
let originalIngredients = '';
let translatedIngredients = '';

$('#translateBtn').click(function () {
  isUrdu = !isUrdu;
  if (isUrdu) {
    $('#instructionsText').text(translatedInstructions);
    $('#ingredientList').html(translatedIngredients);
    $(this).text('Translate to English');
  } else {
    $('#instructionsText').text(originalInstructions);
    $('#ingredientList').html(originalIngredients);
    $(this).text('Translate to Urdu');
  }
});

function translateToUrdu(text) {
  return text
.replace(/chicken/gi, "چکن")
.replace(/water/gi, "پانی")
.replace(/salt/gi, "نمک")
.replace(/pepper/gi, "کالی مرچ")
.replace(/onion/gi, "پیاز")
.replace(/garlic/gi, "لہسن")
.replace(/mix/gi, "مکس کریں")
.replace(/cook/gi, "پکائیں")
.replace(/boil/gi, "ابالیں")
.replace(/add/gi, "شامل کریں")
.replace(/serve/gi, "پیش کریں")
.replace(/and/gi, "اور")
.replace(/cold/gi, "ٹھندا")
.replace(/knife/gi, "چھری")
.replace(/bread/gi, "روٹی")
.replace(/crumble/gi, "چورا کریں")
.replace(/pieces/gi, "ٹکڑے")
.replace(/lentils/gi, "مسور کی دال")
.replace(/foreign debris/gi, "غیر متعلقہ ذرات")
.replace(/rinse/gi, "دھوئیں")
.replace(/drain/gi, "چھانیں")
.replace(/set aside/gi, "ایک طرف رکھ دیں")
.replace(/solid block/gi, "ٹھوس بلاک")
.replace(/break up/gi, "توڑیں")
.replace(/large pot/gi, "بڑا برتن")
.replace(/medium-high heat/gi, "درمیانہ سے تیز آنچ")
.replace(/sauté/gi, "تلیں")
.replace(/pinch of salt/gi, "ایک چٹکی نمک")
.replace(/carrots/gi, "گاجریں")
.replace(/tomato paste/gi, "ٹماٹر کا پیسٹ")
.replace(/stir/gi, "ہلائیں")
.replace(/around 1 minute/gi, "تقریباً 1 منٹ")
.replace(/cumin/gi, "زیرہ")
.replace(/paprika/gi, "پیپریکا")
.replace(/mint/gi, "پودینہ")
.replace(/thyme/gi, "تھائم")
.replace(/red pepper/gi, "سرخ مرچ")
.replace(/bloom the spices/gi, "مصالحوں کی خوشبو نکالیں")
.replace(/amazing smell/gi, "زبردست خوشبو")
.replace(/broth/gi, "یخنی")
.replace(/soup/gi, "سوپ")
.replace(/sprinkle/gi, "چھڑکیں")
.replace(/cover/gi, "ڈھانپیں")
.replace(/damp cloth/gi, "گیلا کپڑا")
.replace(/leave/gi, "چھوڑ دیں")
.replace(/minutes/gi, "منٹ")
.replace(/heat/gi, "گرم کریں")
.replace(/olive oil/gi, "زیتون کا تیل")
.replace(/deep pan/gi, "گہرا پین")
.replace(/cloves/gi, "جَوے")
.replace(/skins/gi, "چھلکے")
.replace(/cut/gi, "کٹ")
.replace(/open/gi, "کھولیں")
.replace(/frying/gi, "تلنا")
.replace(/set aside/gi, "الگ رکھ دیں")
.replace(/oil/gi, "تیل")
.replace(/fried/gi, "تلا ہوا")
.replace(/simmer/gi, "دھیمی آنچ پر پکائیں")
.replace(/stirring/gi, "چمچ چلانا")
.replace(/constantly/gi, "مسلسل")
.replace(/grinding/gi, "پسی ہوئی")
.replace(/black pepper/gi, "کالی مرچ")
.replace(/continue/gi, "جاری رکھیں")
.replace(/soft/gi, "نرم")
.replace(/golden/gi, "سنہری")
.replace(/step/gi, "مرحلہ")
.replace(/make/gi, "بنائیں")
.replace(/sushi/gi, "سوشی")
.replace(/rolls/gi, "رولز")
.replace(/pat/gi, "ہاتھ سے دبا کر لگائیں")
.replace(/rice/gi, "چاول")
.replace(/lay/gi, "بچھائیں")
.replace(/nori/gi, "نوری")
.replace(/sheet/gi, "چادر")
.replace(/mat/gi, "چٹائی")
.replace(/shiny-side/gi, "چمکدار رخ")
.replace(/dip/gi, "ڈبونا")
.replace(/vinegared water/gi, "سرکے والا پانی")
.replace(/handfuls/gi, "مٹھی بھر")
.replace(/thick/gi, "موٹی")
.replace(/layer/gi, "پرت")
.replace(/furthest/gi, "سب سے دور")
.replace(/edge/gi, "کنارہ")
.replace(/clear/gi, "صاف")
.replace(/spread/gi, "پھیلائیں")
.replace(/japanese mayonnaise/gi, "جاپانی مایونیز")
.replace(/spoon/gi, "چمچ")
.replace(/thin/gi, "پتلی")
.replace(/middle/gi, "درمیان")
.replace(/filling/gi, "بھرتی")
.replace(/child/gi, "بچہ")
.replace(/top/gi, "اوپر رکھیں")
.replace(/line/gi, "قطار")
.replace(/favourite/gi, "پسندیدہ")
.replace(/tuna/gi, "ٹونا")
.replace(/cucumber/gi, "کھیرا")
.replace(/lift/gi, "اٹھائیں")
.replace(/pressure/gi, "دباؤ")
.replace(/keep/gi, "رکھنا")
.replace(/tight/gi, "ٹائٹ")
.replace(/stick/gi, "چپکائیں")
.replace(/stamp/gi, "ٹکٹ")
.replace(/brush/gi, "برش کریں")
.replace(/wrap/gi, "لپیٹیں")
.replace(/cling film/gi, "پلاسٹک ریپ")
.replace(/remove/gi, "ہٹائیں")
.replace(/grown-up/gi, "بڑا فرد")
.replace(/cut/gi, "کاٹیں")
.replace(/slices/gi, "سلائسز")
.replace(/unravel/gi, "کھول دیں")
.replace(/pressed/gi, "دبایا ہوا")
.replace(/smoked salmon/gi, "سموکڈ سامن")
.replace(/line a loaf tin/gi, "لوف ٹن کو لائن کریں")
.replace(/place/gi, "رکھیں")
.replace(/inside/gi, "اندر")
.replace(/fish/gi, "مچھلی")
.replace(/fold/gi, "موڑیں")
.replace(/turn/gi, "الٹ دیں")
.replace(/block/gi, "ٹکڑا")
.replace(/chopping board/gi, "کٹنگ بورڈ")
.replace(/fingers/gi, "لمبے ٹکڑے")
.replace(/topping/gi, "اوپری جز")
.replace(/square/gi, "مربع")
.replace(/prawn/gi, "جھینگا")
.replace(/small piece/gi, "چھوٹا ٹکڑا")
.replace(/damp hands/gi, "گیلے ہاتھ")
.replace(/walnut-sized/gi, "اخروٹ کے برابر")
.replace(/balls/gi, "گیندیں")
.replace(/corners/gi, "کونے")
.replace(/together/gi, "اکٹھا")
.replace(/twisting/gi, "بل دینا")
.replace(/unwrap/gi, "کھولیں")
.replace(/serve/gi, "پیش کریں")
.replace(/pick through/gi, "چھان لیں")
.replace(/lentils/gi, "دال")
.replace(/foreign debris/gi, "غیر متعلقہ ذرات")
.replace(/rinse/gi, "دھوئیں")
.replace(/drain/gi, "چھان لیں")
.replace(/set aside/gi, "علیحدہ رکھیں")
.replace(/solid block/gi, "ٹھوس شکل")
.replace(/break up/gi, "توڑنا")
.replace(/large pot/gi, "بڑا برتن")
.replace(/medium-high heat/gi, "درمیانی سے زیادہ آنچ")
.replace(/sauté/gi, "ہلکی آنچ پر تلیں")
.replace(/pinch of salt/gi, "چٹکی بھر نمک")
.replace(/carrots/gi, "گاجریں")
.replace(/another/gi, "مزید")
.replace(/tomato paste/gi, "ٹماٹر پیسٹ")
.replace(/stir/gi, "ہلائیں")
.replace(/cumin/gi, "زیرہ")
.replace(/paprika/gi, "پاپریکا")
.replace(/mint/gi, "پودینہ")
.replace(/thyme/gi, "تھائم")
.replace(/red pepper/gi, "سرخ مرچ")
.replace(/quickly/gi, "جلدی سے")
.replace(/bloom/gi, "خوشبو چھوڑنا")
.replace(/spices/gi, "مسالے")
.replace(/congratulate/gi, "مبارکباد دیں")
.replace(/smells/gi, "خوشبو آ رہی ہے")
.replace(/broth/gi, "یخنی")
.replace(/soup/gi, "سوپ")
.replace(/gentle boil/gi, "ہلکی ابال")
.replace(/reduce heat/gi, "آنچ کم کریں")
.replace(/medium-low/gi, "درمیانی سے کم")
.replace(/cover halfway/gi, "آدھا ڈھانپیں")
.replace(/fallen apart/gi, "گل گئی ہو")
.replace(/completely cooked/gi, "مکمل پکی ہوئی")
.replace(/tender/gi, "نرم")
.replace(/blend/gi, "بلینڈ کریں")
.replace(/blender/gi, "بلینڈر")
.replace(/hand blender/gi, "ہینڈ بلینڈر")
.replace(/consistency/gi, "گاڑھا پن")
.replace(/taste/gi, "چکھیں")
.replace(/seasoning/gi, "مصالہ/ذائقہ")
.replace(/necessary/gi, "ضروری ہو")
.replace(/crushed-up crackers/gi, "ٹوٹے ہوئے کریکرز")
.replace(/torn up bread/gi, "پھٹی ہوئی روٹی")
.replace(/extra thickness/gi, "زیادہ گاڑھا پن")
.replace(/traditional thickener/gi, "روایتی گاڑھا کرنے والا جز")
.replace(/cornstarch/gi, "کارن اسٹارچ")
.replace(/flour/gi, "میدہ")
.replace(/texture/gi, "بافت")
.replace(/saltiness/gi, "نمکین مزہ")
.replace(/leftovers/gi, "بچاہوا کھانا")
.replace(/fridge/gi, "فریج")
.replace(/week/gi, "ہفتہ")
.replace(/preheat/gi, "پہلے سے گرم کریں")
.replace(/oven/gi, "اوون")
.replace(/degrees/gi, "ڈگری")
.replace(/gas/gi, "گیس")
.replace(/toss/gi, "اچھی طرح ملائیں")
.replace(/beef/gi, "گوشت")
.replace(/flour/gi, "میدہ")
.replace(/together/gi, "اکٹھا")
.replace(/bowl/gi, "برتن")
.replace(/casserole/gi, "دیگچی")
.replace(/hot/gi, "گرم")
.replace(/rapeseed oil/gi, "سرسوں کا تیل")
.replace(/brown/gi, "براؤن کریں")
.replace(/remove/gi, "نکالیں")
.replace(/repeat/gi, "دہرائیں")
.replace(/remaining/gi, "باقی")
.replace(/return/gi, "واپس ڈالیں")
.replace(/wine/gi, "شراب")
.replace(/volume/gi, "مقدار")
.replace(/liquid/gi, "مائع")
.replace(/reduce/gi, "کم کریں")
.replace(/stock/gi, "یخنی")
.replace(/mustard/gi, "سرسوں")
.replace(/lid/gi, "ڈھکن")
.replace(/cool/gi, "ٹھنڈا ہونے دیں")
.replace(/assemble/gi, "جوڑیں")
.replace(/pie dish/gi, "پائی ڈش")
.replace(/rim/gi, "کنارا")
.replace(/beaten egg yolk/gi, "پھینٹا ہوا انڈے کی زردی")
.replace(/top/gi, "اوپر")
.replace(/trim/gi, "تراشیں")
.replace(/crimp/gi, "موڑیں")
.replace(/edges/gi, "کنارے")
.replace(/golden-brown/gi, "سنہری بھورا")
.replace(/cooked through/gi, "پوری طرح پکا ہوا")
.replace(/green beans/gi, "سبز پھلیاں")
.replace(/saucepan/gi, "چھوٹا برتن")
.replace(/salted/gi, "نمکین پانی")
.replace(/butter/gi, "مکھن")
.replace(/alongside/gi, "ساتھ")
.replace(/cubes/gi, "ٹکڑے")
.replace(/high heat/gi, "تیز آنچ")
.replace(/batches/gi, "چند حصے")
.replace(/overcrowd/gi, "زیادہ بھرنا")
.replace(/flameproof/gi, "آگ برداشت کرنے والا")
.replace(/shallots/gi, "چھوٹے پیاز")
.replace(/slightly/gi, "تھوڑا سا")
.replace(/herbs/gi, "جڑی بوٹیاں")
.replace(/pour/gi, "ڈالیں")
.replace(/boil/gi, "ابالیں")
.replace(/stuck-on/gi, "چپکا ہوا")
.replace(/fat/gi, "چکنائی")
.replace(/skim off/gi, "اوپر کی تہہ ہٹائیں")
.replace(/cornflour paste/gi, "کارن فلور مکسچر")
.replace(/hob/gi, "چولہے پر")
.replace(/grate/gi, "کش کریں")
.replace(/round-bladed knife/gi, "گول دھار چھری")
.replace(/knead/gi, "گوندھیں")
.replace(/lightly/gi, "ہلکے سے")
.replace(/ball/gi, "گیند")
.replace(/floured surface/gi, "آٹے والی سطح")
.replace(/set aside/gi, "علیحدہ رکھیں")
.replace(/roll out/gi, "بیلیں")
.replace(/line the dish/gi, "ڈش کو لائن کریں")
.replace(/pile in/gi, "ڈال دیں")
.replace(/tuck in/gi, "دبا کر رکھیں")
.replace(/glaze/gi, "چمکائیں")
.replace(/baking tray/gi, "بیکنگ ٹرے")
.replace(/bubbling/gi, "بلبلے اٹھنا")
.replace(/marinate/gi, "مرینیٹ کریں")
.replace(/vinegar/gi, "سرکہ")
.replace(/bay leaves/gi, "تیز پات")
.replace(/lemon/gi, "لیموں")
.replace(/tomato sauce/gi, "ٹماٹر سوس")
.replace(/knorr cube/gi, "کِنور کیوب")
.replace(/sriracha/gi, "سرراچا")
.replace(/ketchup/gi, "کیچپ")
.replace(/sugar/gi, "چینی")
.replace(/mash/gi, "مسلیں")
.replace(/wasabi/gi, "وسابی")
.replace(/scallions/gi, "ہری پیاز")
.replace(/diagonal/gi, "ترچھا")
.replace(/dice/gi, "چھوٹے ٹکڑے کریں")
.replace(/trim/gi, "تراشیں")
.replace(/soften/gi, "نرم کریں")
.replace(/grater/gi, "کدو کش")
.replace(/gravy/gi, "شوربہ")
.replace(/parsley/gi, "اجوائن کے پتے")
.replace(/hot pepper/gi, "مرچ")
.replace(/salad/gi, "سلاد")
.replace(/enjoy/gi, "لطف اٹھائیں")
.replace(/roast/gi, "بھونیں")
.replace(/peanuts/gi, "مونگ پھلی")
.replace(/coconut cream/gi, "ناریل کریم")
.replace(/curry paste/gi, "کری پیسٹ")
.replace(/seal/gi, "بند کریں")
.replace(/fish sauce/gi, "مچھلی ساس")
.replace(/jasmine rice/gi, "جیسمن چاول")
.replace(/produce/gi, "اشیاء")
.replace(/dry/gi, "خشک کریں")
.replace(/soak/gi, "بھگوئیں")
.replace(/pasty/gi, "لیس دار")
.replace(/form/gi, "بنائیں")
.replace(/meatloaves/gi, "گوشت کی ڈلیاں")
.replace(/spread/gi, "پھیلائیں")
.replace(/sheet/gi, "شیٹ")
.replace(/reserve/gi, "محفوظ رکھیں")
.replace(/fragrant/gi, "خوشبودار")
.replace(/evaporate/gi, "اُڑ جانا (بخارات بننا)")
.replace(/drain/gi, "چھان لیں")
.replace(/blend/gi, "بلینڈ کریں")
.replace(/hand blender/gi, "ہینڈ بلینڈر")
.replace(/consistency/gi, "مکمل ساخت")
.replace(/leftovers/gi, "بچا ہوا کھانا")
.replace(/refrigerator|fridge/gi, "فریج")
.replace(/seasoning/gi, "مزہ (نمک مرچ)")
.replace(/thickness/gi, "گاڑھا پن")
.replace(/texture/gi, "ساخت")
.replace(/stick/gi, "چپکنا")
.replace(/smells/gi, "خوشبو آنا")
.replace(/gentle boil/gi, "ہلکی آنچ پر اُبال")
.replace(/cover halfway/gi, "آدھا ڈھکن لگائیں")
.replace(/carrots/gi, "گاجریں")
.replace(/fall apart/gi, "ٹوٹ جانا")
.replace(/cut in quarters/gi, "چار حصوں میں کاٹیں")
.replace(/serve immediately/gi, "فوراً پیش کریں")
.replace(/overnight/gi, "رات بھر")
.replace(/tray/gi, "ٹرے")
.replace(/griddle/gi, "توا")
.replace(/crush/gi, "کچلیں")
.replace(/brisket/gi, "سینہ کا گوشت")
.replace(/lettuce/gi, "سلاد کے پتے")
.replace(/mozzarella/gi, "موزریلا پنیر")
.replace(/fry until browned/gi, "براؤن ہونے تک تلیں")
.replace(/opposite side/gi, "دوسری طرف")
.replace(/plate/gi, "پلیٹ")
.replace(/finely chopped/gi, "باریک کٹا ہوا")
.replace(/minced/gi, "قیمہ بنایا ہوا")
.replace(/filo pastry/gi, "فائیلو پیسٹری")
.replace(/layer/gi, "پرت")
.replace(/coated/gi, "چکنا کیا ہوا")
.replace(/pastry/gi, "پیسٹری")
.replace(/five or six layers/gi, "پانچ یا چھ پرتیں")
.replace(/mix/gi, "مکس کریں")
.replace(/milk/gi, "دودھ")
.replace(/egg/gi, "انڈا")
.replace(/together/gi, "اکٹھا")
.replace(/sift/gi, "چھانیں")
.replace(/baking powder/gi, "بیکنگ پاؤڈر")
.replace(/salt/gi, "نمک")
.replace(/stir well/gi, "اچھی طرح ہلائیں")
.replace(/batter/gi, "بیٹر")
.replace(/pan/gi, "پین")
.replace(/thin layer/gi, "پتلی پرت")
.replace(/air bubbles/gi, "ہوا کے بلبلے")
.replace(/butter/gi, "مکھن")
.replace(/cream corn/gi, "کریم کارن")
.replace(/crushed peanuts/gi, "کچلی ہوئی مونگ پھلی")
.replace(/sugar/gi, "چینی")
.replace(/fold/gi, "مروڑنا")
.replace(/bottom surface/gi, "نیچے کی سطح")
.replace(/browned/gi, "براؤن")
.replace(/cut into wedges/gi, "کٹویں میں کاٹیں")
.replace(/best eaten when warm/gi, "جب گرم ہو تو بہتر کھائیں")
.replace(/biscuits/gi, "بیسکٹس")
.replace(/re-sealable freezer bag/gi, "ری سِیل ایبل فریزر بیگ")
.replace(/bash with a rolling pin/gi, "بھپے سے کچل دیں")
.replace(/fine crumbs/gi, "باریک ٹکڑے")
.replace(/melt/gi, "پگھلائیں")
.replace(/tart tin/gi, "ٹارٹ ٹِن")
.replace(/base and sides/gi, "نیچے اور کنارے")
.replace(/chill/gi, "ٹھنڈا کریں")
.replace(/cream together/gi, "ایک ساتھ کریم کریں")
.replace(/food processor/gi, "فوڈ پروسیسر")
.replace(/process for 2-3 minutes/gi, "2‑3 منٹ پروسیس کریں")
.replace(/ground almonds/gi, "پسی ہوئی بادام")
.replace(/almond extract/gi, "بادام کا عرق")
.replace(/blend until well combined/gi, "اچھی طرح مکس ہونے تک ملا دیں")
.replace(/peel the apples/gi, "سیب چھیلیں")
.replace(/cut thin slices/gi, "باریک ٹکڑے کاٹیں")
.replace(/prevent from going brown/gi, "براؤن ہونے سے روکیں")
.replace(/arrange slices/gi, "ٹکڑے لگائیں")
.replace(/frangipane filling/gi, "فرنجیپین فلنگ")
.replace(/level the surface/gi, "سطح یکساں کریں")
.replace(/sprinkle with flaked almonds/gi, "فلےڈ بادام چھڑکیں")
.replace(/leave to cool for 15 minutes/gi, "15 منٹ ٹھنڈا ہونے دیں")
.replace(/stand the tin on a can/gi, "ٹِن کو کین پر رکھیں")
.replace(/push down gently on edges/gi, "کناروں پر ہلکا دبائیں")
.replace(/serving plate/gi, "پیش کرنے کی پلیٹ")
.replace(/cream|crème fraîche|ice cream/gi, "کریم/کریم فریش/آئس کریم")
.replace(/fan oven/gi, "فَن اوون")
.replace(/conventional oven/gi, "روایتی اوون")
.replace(/roll out the pastry/gi, "پیسٹری بیلیں")
.replace(/fluted cutter/gi, "فلُوٹڈ کٹر")
.replace(/tart shells/gi, "ٹارٹ خول")
.replace(/nuts/gi, "گری دار میوے")
.replace(/level with pastry/gi, "پیسٹری کے برابر")
.replace(/pale golden/gi, "ہلکا سنہری")
.replace(/wire rack/gi, "وائر ریک")
.replace(/serve warm or cold/gi, "گرم یا ٹھنڈا پیش کریں")
.replace(/yeast/gi, "خمیر")
.replace(/lukewarm/gi, "ہلکا گرم")
.replace(/soft dough/gi, "نرم آٹا")
.replace(/smooth and elastic/gi, "ہموار اور لچکدار")
.replace(/sticky/gi, "چپچپا")
.replace(/work surface/gi, "کام کی سطح")
.replace(/lightly greased/gi, "ہلکا چکنا کیا ہوا")
.replace(/knock back/gi, "دوبا مٹائیں")
.replace(/rectangle/gi, "مستطیل شکل")
.replace(/brown sugar/gi, "براؤن چینی")
.replace(/cinnamon/gi, "دار چینی")
.replace(/dried fruit/gi, "خشک میوہ جات")
.replace(/tight cylinder/gi, "ٹائٹ سلنڈر")
.replace(/slice/gi, "ٹکڑے")
.replace(/rise for 30 minutes/gi, "30 منٹ بڑھنے دیں")
.replace(/cinnamon filling/gi, "دارچینی فلنگ")
.replace(/bun/gi, "بن")
.replace(/glaze/gi, "چمکائیں")
.replace(/custard powder/gi, "کسٹرڈ پاؤڈر")
.replace(/chocolate/gi, "چاکلیٹ")
.replace(/vanilla pod|extract/gi, "ونیلا پوڈ/عطر")
.replace(/sieve/gi, "چننی")
.replace(/square tin/gi, "مربع ٹِن")
.replace(/custard icing/gi, "کسٹرڈ آئسنگ")
.replace(/press into the base/gi, "نیچے پرس کریں")
.replace(/assorted almonds/gi, "مخلوط بادام")
.replace(/chill until firm/gi, "ٹھنڈا کرکے پکا ہونے دیں")
.replace(/slice into squares/gi, "چوکور ٹکڑوں میں کاٹیں")
.replace(/pumpkin/gi, "کدو")
.replace(/sieve cooked pumpkin/gi, "پکا ہوا کدو چنیں")
.replace(/nutmeg/gi, "جائفل")
.replace(/puree/gi, "پوری کریں")
.replace(/beat yolks and sugar/gi, "زردی اور چینی پھینٹیں")
.replace(/pliant dough/gi, "نرم آٹا")
.replace(/oblong/gi, "لمبا ٹکڑا")
.replace(/sausages/gi, "ساسیجز")
.replace(/bread sound hollow/gi, "ڈبل روٹی خالی آواز دے")
.replace(/slice medium size/gi, "درمیانی سائز میں کاٹیں")
.replace(/avocados/gi, "ایووکاڈو")
.replace(/cucumber/gi, "کھیرا")
.replace(/drizzle with dressing/gi, "ڈریسنگ سے چھڑکیں")
.replace(/non-stick pan/gi, "نان اسٹک پین")
.replace(/crispy but moist/gi, "کریپی لیکن اندر نرم")
.replace(/toss potatoes/gi, "آلو ہلائیں")
.replace(/plunge into cold water/gi, "ٹھنڈے پانی میں ڈالیں")
.replace(/boil pasta/gi, "پاستا اُبالیں")
.replace(/olive oil/gi, "زیتون کا تیل")
.replace(/tuna/gi, "ٹونا")
.replace(/lettuce|salad leaves/gi, "سلاد کے پتے")
.replace(/avocado mix/gi, "ایووکاڈو مکس")
.replace(/snap peas/gi, "سنیپ مٹر")
.replace(/chilli/gi, "مرچ")
.replace(/spring onions/gi, "ہری پیاز")
.replace(/basil/gi, "تلسی")
.replace(/crusty bread/gi, "کریسٹی بریڈ")
.replace(/pasta sauce/gi, "پاستا ساس")
.replace(/halved and sliced/gi, "آدھے کرکے کاٹے ہوئے")
.replace(/drizzle olive oil/gi, "زیتون کا تیل چھڑکیں")
.replace(/peppercorns/gi, "کالی مرچ کے دانے")
.replace(/vinegar/gi, "سرکہ")
.replace(/marinate/gi, "مرینیٹ کریں")
.replace(/soy sauce/gi, "سویا ساس")
.replace(/bay leaves/gi, "تیز پات")
.replace(/beef cubes/gi, "گوشت کے ٹکڑے")
.replace(/open flame grill/gi, "کھلے شعلے پر گرل کریں")
.replace(/shellfish|mussels|prawns/gi, "سی فوڈ/مسلس/جھینگے")
.replace(/saffron/gi, "زعفران")
.replace(/vermicelli/gi, "ورمیسیلی")
.replace(/paella pan/gi, "پایلا پین")
.replace(/hinges buried/gi, "ہچز دبا کر رکھیں")
.replace(/charcoal smoke infusion/gi, "کوئلے کے دھوئیں کا ذائقہ")
.replace(/dragon bowl|rameks|ramekins/gi, "ریمکن")
.replace(/balloon whisk/gi, "بیلون وہسک")
.replace(/peaks begin to form/gi, "پییکس بننے لگیں")
.replace(/soufflé mix/gi, "سوفلے مکسچر")
.replace(/goat's cheese/gi, "بکری کا پنیر")
.replace(/bowl of simmering water/gi, "ہلکے اُبالے پانی کا برتن")
.replace(/runny dressing/gi, "سیلنا ڈریسنگ")
.replace(/kale|spinach|courgette/gi, "کیلے/پالک/زکینی")
.replace(/tahini dressing/gi, "تہینی ڈریسنگ")
.replace(/clotted cream/gi, "کٹڈ کریم")
.replace(/nutmeg|cayenne|Gruyère/gi, "جائفل/کیئن/گریری پنیر")
.replace(/beetroot/gi, "چقندر")
.replace(/broccoli/gi, "بروکلی")
.replace(/zucchini/gi, "توری")
.replace(/radish/gi, "مولی")
.replace(/turnip/gi, "شلجم")
.replace(/artichoke/gi, "آرٹیچوک")
.replace(/okra/gi, "بھنڈی")
.replace(/asparagus/gi, "اسپیراگس")
.replace(/leek/gi, "ہرا پیاز")
.replace(/celery/gi, "سیلری")
.replace(/arugula/gi, "آروگولا")
.replace(/kale/gi, "کھیل")
.replace(/mustard greens/gi, "سرسوں کے پتے")
.replace(/swiss chard/gi, "سوئس چارڈ")
.replace(/yam/gi, "شکر قندی")
.replace(/brinjal/gi, "بینگن")
.replace(/banana/gi, "کیلا")
.replace(/apple/gi, "سیب")
.replace(/orange/gi, "کینو")
.replace(/grape/gi, "انگور")
.replace(/mango/gi, "آم")
.replace(/pineapple/gi, "انناس")
.replace(/watermelon/gi, "تربوز")
.replace(/melon/gi, "خربوزہ")
.replace(/papaya/gi, "پپیتا")
.replace(/guava/gi, "امرود")
.replace(/peach/gi, "آڑو")
.replace(/plum/gi, "آلو بخارا")
.replace(/cherry/gi, "چیری")
.replace(/apricot/gi, "خوبانی")
.replace(/strawberry/gi, "اسٹرابیری")
.replace(/blueberry/gi, "بلیو بیری")
.replace(/blackberry/gi, "بلیک بیری")
.replace(/raspberry/gi, "ریسپ بیری")
.replace(/fig/gi, "انجیر")
.replace(/pomegranate/gi, "انار")
.replace(/coconut/gi, "ناریل")
.replace(/avocado/gi, "ایووکاڈو")
.replace(/kiwi/gi, "کیوی")
.replace(/date/gi, "کھجور")
.replace(/pear/gi, "ناشپاتی")
.replace(/lychee/gi, "لیچی")
.replace(/spoon/gi, "چمچ")
.replace(/fork/gi, "کانٹا")
.replace(/knife/gi, "چاقو")
.replace(/plate/gi, "پلیٹ")
.replace(/bowl/gi, "کٹورا")
.replace(/glass/gi, "گلاس")
.replace(/mug/gi, "مگ")
.replace(/cup/gi, "پیالی")
.replace(/kettle/gi, "کیتلی")
.replace(/pan/gi, "پین")
.replace(/pot/gi, "برتن")
.replace(/lid/gi, "ڈھکن")
.replace(/strainer/gi, "چھلنی")
.replace(/grater/gi, "کش کرنے والا آلہ")
.replace(/whisk/gi, "پھینٹنے والا")
.replace(/tongs/gi, "چمٹا")
.replace(/rolling pin/gi, "بیلن")
.replace(/cutting board/gi, "کٹنگ بورڈ")
.replace(/tray/gi, "ٹرے")
.replace(/jug/gi, " جگ")
.replace(/cold/gi, "ٹھنڈا")
.replace(/hot/gi, "گرم")
.replace(/warm/gi, "ہلکا گرم")
.replace(/cool/gi, "ٹھنڈا کرنا")
.replace(/fresh/gi, "تازہ")
.replace(/rotten/gi, "سڑا ہوا")
.replace(/burnt/gi, "جلا ہوا")
.replace(/delicious/gi, "لذیذ")
.replace(/tasty/gi, "مزیدار")
.replace(/bland/gi, "بے ذائقہ")
.replace(/spicy/gi, "مرچ دار")
.replace(/sour/gi, "کھٹا")
.replace(/sweet/gi, "میٹھا")
.replace(/bitter/gi, "کڑوا")
.replace(/salty/gi, "نمکین")
.replace(/ready/gi, "تیار")
.replace(/raw/gi, "کچا")
.replace(/cooked/gi, "پکا ہوا")
.replace(/frozen/gi, "منجمد")
.replace(/refrigerated/gi, "فریج میں رکھا ہوا")
.replace(/soft/gi, "نرم")
.replace(/hard/gi, "سخت")
.replace(/thick/gi, "گاڑھا")
.replace(/thin/gi, "پتلا")
.replace(/dry/gi, "خشک")
.replace(/wet/gi, "گیلا")
.replace(/clean/gi, "صاف")
.replace(/dirty/gi, "گندا")
.replace(/new/gi, "نیا")
.replace(/old/gi, "پرانا")
.replace(/chop/gi, "کٹائی کریں")
.replace(/slice/gi, "ٹکڑے کریں")
.replace(/dice/gi, "چھوٹے ٹکڑے کریں")
.replace(/marinate/gi, "میرینیٹ کریں")
.replace(/mix well/gi, "اچھی طرح مکس کریں")
.replace(/deep fry/gi, "ڈیپ فرائی کریں")
.replace(/shallow fry/gi, "ہلکی فرائی کریں")
.replace(/roast/gi, "روسٹ کریں")
.replace(/grill/gi, "گرل کریں")
.replace(/toast/gi, "ٹوست کریں")
.replace(/steam/gi, "بھاپ میں پکائیں")
.replace(/bake/gi, "بیک کریں")
.replace(/boil/gi, "ابالیں")
.replace(/simmer/gi, "ہلکی آنچ پر پکائیں")
.replace(/stir/gi, "چمچ چلائیں")
.replace(/whisk/gi, "پھینٹیں")
.replace(/blend/gi, "بلینڈ کریں")
.replace(/grind/gi, "پیسیں")
.replace(/knead/gi, "گوندھیں")
.replace(/pour/gi, "انڈیلیں")
.replace(/sprinkle/gi, "چھڑکیں")
.replace(/spread/gi, "پھیلائیں")
.replace(/heat oil/gi, "تیل گرم کریں")
.replace(/turn on stove/gi, "چولہا جلائیں")
.replace(/turn off stove/gi, "چولہا بند کریں")
.replace(/preheat oven/gi, "اوون پہلے سے گرم کریں")
.replace(/serve/gi, "پیش کریں")
.replace(/garnish/gi, "سجائیں")
.replace(/keep aside/gi, "الگ رکھ دیں")
.replace(/cover/gi, "ڈھانپیں")
.replace(/uncover/gi, "کھولیں")
.replace(/let it rest/gi, "رہنے دیں")
.replace(/let it cook/gi, "پکنے دیں")
.replace(/flip/gi, "پلٹیں")
.replace(/smash/gi, "کچلیں")
.replace(/soak/gi, "بھگو دیں")
.replace(/drain/gi, "نچوڑیں")
.replace(/strain/gi, "چھانیں")
.replace(/defrost/gi, "ڈیفروسٹ کریں")
.replace(/microwave/gi, "مائیکروویو کریں")
.replace(/reheat/gi, "دوبارہ گرم کریں")
.replace(/refrigerate/gi, "فریج میں رکھیں")
.replace(/freeze/gi, "فریز کریں")
.replace(/taste/gi, "چکھیں")
.replace(/smell/gi, "سونگھیں")
.replace(/bite/gi, "کاتیں")
.replace(/chew/gi, "چبائیں")
.replace(/swallow/gi, "نگلیں")
.replace(/digest/gi, "ہضم کریں")
.replace(/stomach/gi, "پیٹ")
.replace(/hungry/gi, "بھوک لگی ہے")
.replace(/full/gi, "پیٹ بھر گیا")
.replace(/thirsty/gi, "پیاس لگی ہے")
.replace(/appetite/gi, "بھوک")
.replace(/craving/gi, "طلب")
.replace(/leftovers/gi, "بچا ہوا کھانا")
.replace(/snack/gi, "ہلکا پھلکا کھانا")
.replace(/meal/gi, "کھانا")
.replace(/dish/gi, "ڈش")
.replace(/breakfast/gi, "ناشتہ")
.replace(/lunch/gi, "دوپہر کا کھانا")
.replace(/dinner/gi, "رات کا کھانا")
.replace(/brunch/gi, "برنچ")
.replace(/midnight snack/gi, "آدھی رات کا ناشتہ")
.replace(/junk food/gi, "جنک فوڈ")
.replace(/healthy food/gi, "صحت مند خوراک")
.replace(/homemade/gi, "گھریلو")
.replace(/fast food/gi, "فاسٹ فوڈ")
.replace(/street food/gi, "اسٹریٹ فوڈ")
.replace(/dessert/gi, "میٹھا")
.replace(/sweet dish/gi, "میٹھی ڈش")
.replace(/ice cream/gi, "آئس کریم")
.replace(/cake/gi, "کیک")
.replace(/pastry/gi, "پیٹری")
.replace(/cookie/gi, "بسکٹ")
.replace(/biscuit/gi, "بسکٹ")
.replace(/bread/gi, "روٹی")
.replace(/butter/gi, "مکھن")
.replace(/cheese/gi, "پنیر")
.replace(/egg/gi, "انڈا")
.replace(/milk/gi, "دودھ")
.replace(/cream/gi, "ملائی")
.replace(/yogurt/gi, "دہی")
.replace(/curd/gi, "دہی")
.replace(/rice/gi, "چاول")
.replace(/wheat/gi, "گندم")
.replace(/flour/gi, "آٹا")
.replace(/salt/gi, "نمک")
.replace(/sugar/gi, "چینی")
.replace(/pepper/gi, "کالی مرچ")
.replace(/cumin/gi, "زیرہ")
.replace(/turmeric/gi, "ہلدی")
.replace(/chili/gi, "مرچ")
.replace(/clove/gi, "لونگ")
.replace(/cinnamon/gi, "دار چینی")
.replace(/cardamom/gi, "الائچی")
.replace(/ginger/gi, "ادرک")
.replace(/garlic/gi, "لہسن")
.replace(/onion/gi, "پیاز")
.replace(/tomato/gi, "ٹماٹر")
.replace(/potato/gi, "آلو")
.replace(/carrot/gi, "گاجر")
.replace(/peas/gi, "مٹر")
.replace(/capsicum/gi, "شملہ مرچ")
.replace(/cabbage/gi, "بند گوبھی")
.replace(/cauliflower/gi, "گوبھی")
.replace(/spinach/gi, "پالک")
.replace(/mint/gi, "پودینہ")
.replace(/coriander/gi, "دھنیا")
.replace(/beef mince/gi, "قیمہ")
.replace(/beef steak/gi, "بیف اسٹیک")
.replace(/beef curry/gi, "بیف سالن")
.replace(/ground beef/gi, "چوپ کیا ہوا گوشت")
.replace(/beef ribs/gi, "بیف کی پسلیاں")
.replace(/brisket/gi, "بریسکیٹ")
.replace(/roast beef/gi, "روسٹ بیف")
.replace(/corned beef/gi, "کارنڈ بیف")
.replace(/breakfast burrito/gi, "ناشتے کا بریٹو")
.replace(/omelette/gi, "آملیٹ")
.replace(/scrambled eggs/gi, "اسکریمبل انڈے")
.replace(/toast with jam/gi, "جام کے ساتھ ٹوسٹ")
.replace(/pancakes/gi, "پین کیکس")
.replace(/hash browns/gi, "ہیش براؤن")
.replace(/waffles/gi, "ویفلز")
.replace(/breakfast sausage/gi, "ناشتے کی ساسیج")
.replace(/fried eggs/gi, "تلے ہوئے انڈے")
.replace(/boiled eggs/gi, "ابلے ہوئے انڈے")
.replace(/chicken breast/gi, "چکن بریسٹ")
.replace(/chicken thighs/gi, "چکن ران")
.replace(/grilled chicken/gi, "گرل چکن")
.replace(/chicken curry/gi, "چکن سالن")
.replace(/chicken nuggets/gi, "چکن نگٹس")
.replace(/chicken wings/gi, "چکن ونگز")
.replace(/roast chicken/gi, "روسٹ چکن")
.replace(/fried chicken/gi, "فرائیڈ چکن")
.replace(/chicken soup/gi, "چکن سوپ")
.replace(/chicken sandwich/gi, "چکن سینڈوچ")
.replace(/chicken biryani/gi, "چکن بریانی")
.replace(/dessert/gi, "میٹھا")
.replace(/chocolate cake/gi, "چاکلیٹ کیک")
.replace(/cheesecake/gi, "چیز کیک")
.replace(/fruit trifle/gi, "فروٹ ٹرائفل")
.replace(/rice pudding/gi, "چاول کی کھیر")
.replace(/custard/gi, "کسٹرڈ")
.replace(/halwa/gi, "حلوہ")
.replace(/gulab jamun/gi, "گلاب جامن")
.replace(/rasmalai/gi, "رس ملائی")
.replace(/goat curry/gi, "بکرے کا سالن")
.replace(/goat meat/gi, "بکرے کا گوشت")
.replace(/goat biryani/gi, "گوشت کی بریانی")
.replace(/grilled goat/gi, "گرل بکرے کا گوشت")
.replace(/lamb chops/gi, "لیمب چاپس")
.replace(/lamb curry/gi, "لیمب سالن")
.replace(/lamb stew/gi, "لیمب اسٹو")
.replace(/slow cooked lamb/gi, "آہستہ پکا ہوا لیمب")
.replace(/pasta salad/gi, "پاستا سلاد")
.replace(/spaghetti/gi, "اسپاگیٹی")
.replace(/macaroni/gi, "میکرونی")
.replace(/lasagna/gi, "لازانیہ")
.replace(/penne pasta/gi, "پینی پاستا")
.replace(/pasta bake/gi, "پاستا بیک")
.replace(/white sauce pasta/gi, "وائٹ ساس پاستا")
.replace(/pork ribs/gi, "پِگ کی پسلیاں")
.replace(/pork chops/gi, "پِگ چاپس")
.replace(/pulled pork/gi, "کھینچا ہوا سور کا گوشت")
.replace(/pork curry/gi, "سور کا سالن")
.replace(/seafood paella/gi, "سی فوڈ پایلا")
.replace(/fish curry/gi, "مچھلی کا سالن")
.replace(/fried fish/gi, "فرائی مچھلی")
.replace(/grilled fish/gi, "گرل مچھلی")
.replace(/shrimp/gi, "جھینگے")
.replace(/prawns/gi, "جھینگا")
.replace(/crab/gi, "کیکڑا")
.replace(/lobster/gi, "لوبسٹر")
.replace(/side salad/gi, "سائیڈ سلاد")
.replace(/coleslaw/gi, "کول سلا")
.replace(/mashed potatoes/gi, "میش آلو")
.replace(/garlic bread/gi, "لہسن کی روٹی")
.replace(/starter soup/gi, "ابتدائی سوپ")
.replace(/chicken corn soup/gi, "چکن کارن سوپ")
.replace(/hot and sour soup/gi, "ہاٹ اینڈ ساور سوپ")
.replace(/veg soup/gi, "ویجیٹیبل سوپ")
.replace(/vegan curry/gi, "ویگن سالن")
.replace(/tofu/gi, "ٹو فو")
.replace(/vegan burger/gi, "ویگن برگر")
.replace(/vegetarian biryani/gi, "سبزی بریانی")
.replace(/vegetarian pizza/gi, "ویجیٹیبل پیزا")
.replace(/vegetarian wrap/gi, "ویجیٹیبل ریپ")
.replace(/vegetable stir fry/gi, "سبزیوں کی فرائی")
.replace(/baked vegetables/gi, "بکی ہوئی سبزیاں")
.replace(/vegetable pulao/gi, "سبزی پلاؤ")
.replace(/grilled vegetables/gi, "گرل سبزیاں")
.replace(/stuffed capsicum/gi, "بھری شملہ مرچ")
.replace(/veg sandwich/gi, "ویجیٹیبل سینڈوچ")
.replace(/veg cutlet/gi, "سبزی کٹلیٹ")
.replace(/paneer/gi, "پنیر")
.replace(/veg noodles/gi, "ویجیٹیبل نوڈلز")
.replace(/veg pakora/gi, "سبزی پکوڑے")
.replace(/veg rolls/gi, "ویجیٹیبل رول")
.replace(/veg kebab/gi, "ویجیٹیبل کباب")
.replace(/dal/gi, "دال")
.replace(/chana masala/gi, "چنا مصالحہ")
.replace(/aloo gobi/gi, "آلو گوبھی")
.replace(/bhindi/gi, "بھنڈی")
.replace(/baingan/gi, "بینگن")
.replace(/karela/gi, "کریلا")
.replace(/methi/gi, "میتھی")
.replace(/lauki/gi, "لوکی")
.replace(/roti/gi, "روٹی")
.replace(/naan/gi, "نان")
.replace(/paratha/gi, "پراٹھا")
.replace(/chapati/gi, "چپاتی")
.replace(/tandoori roti/gi, "تندوری روٹی")
.replace(/roomali roti/gi, "رومالی روٹی")
.replace(/stuffed paratha/gi, "بھرا ہوا پراٹھا")
.replace(/plain rice/gi, "سادہ چاول")
.replace(/jeera rice/gi, "زیرہ چاول")
.replace(/fried rice/gi, "فرائیڈ رائس")
.replace(/biryani/gi, "بریانی")
.replace(/pulao/gi, "پلاؤ")
.replace(/egg fried rice/gi, "انڈہ فرائیڈ رائس")
.replace(/sindhi biryani/gi, "سندھی بریانی")
.replace(/vegetable biryani/gi, "سبزی بریانی")
.replace(/beef biryani/gi, "بیف بریانی")
.replace(/chicken pulao/gi, "چکن پلاؤ")
.replace(/dal chawal/gi, "دال چاول")
.replace(/fish biryani/gi, "فش بریانی")
.replace(/green chutney/gi, "ہری چٹنی")
.replace(/imli chutney/gi, "املی چٹنی")
.replace(/raita/gi, "رائتہ")
.replace(/salad/gi, "سلاد")
.replace(/kachumber salad/gi, "کچومر سلاد")
.replace(/macaroni salad/gi, "میکرونی سلاد")
.replace(/fruit salad/gi, "فروٹ سلاد")
.replace(/coleslaw salad/gi, "کولسلاو")
.replace(/meetha raita/gi, "میٹھا رائتہ")
.replace(/mint raita/gi, "پودینے کا رائتہ")
.replace(/boondi raita/gi, "بوندی رائتہ")
.replace(/zeera raita/gi, "زیرہ رائتہ")
.replace(/veg raita/gi, "سبزی رائتہ")
.replace(/kheer/gi, "کھیر")
.replace(/seviyan/gi, "سویاں")
.replace(/shahi tukray/gi, "شاہی ٹکڑے")
.replace(/fruit custard/gi, "فروٹ کسٹرڈ")
.replace(/chocolate mousse/gi, "چاکلیٹ موس")
.replace(/ice cream sundae/gi, "آئس کریم سنڈے")
.replace(/brownie/gi, "براؤنی")
.replace(/molten lava cake/gi, "مولٹن لاوا کیک")
.replace(/doughnut/gi, "ڈونٹ")
.replace(/apple pie/gi, "ایپل پائی")
.replace(/cherry tart/gi, "چیری ٹارٹ")
.replace(/pudding/gi, "پڈنگ")
.replace(/jelly/gi, "جیلی")
.replace(/fruit jelly/gi, "فروٹ جیلی")
.replace(/banana split/gi, "کیلا اسپلٹ")
.replace(/toffee/gi, "ٹو فی")
.replace(/butterscotch/gi, "بٹر اسکاچ")
.replace(/vanilla ice cream/gi, "ونیلا آئس کریم")
.replace(/strawberry ice cream/gi, "اسٹرابیری آئس کریم")
.replace(/chocolate ice cream/gi, "چاکلیٹ آئس کریم")
.replace(/gulab jamun/gi, "گلاب جامن")
.replace(/jalebi/gi, "جلیبی")
.replace(/barfi/gi, "برفی")
.replace(/rasgulla/gi, "رس گلا")
.replace(/sohan halwa/gi, "سوہن حلوہ")
.replace(/dry fruits halwa/gi, "خشک میوہ حلوہ")
.replace(/pista barfi/gi, "پستہ برفی")
.replace(/coconut barfi/gi, "ناریل برفی")
.replace(/badam halwa/gi, "بادام حلوہ")
.replace(/lauki halwa/gi, "لوکی کا حلوہ")
.replace(/carrot halwa/gi, "گاجر کا حلوہ")
.replace(/besan halwa/gi, "بیسن کا حلوہ")
.replace(/suji halwa/gi, "سوجی کا حلوہ")
.replace(/dates halwa/gi, "کھجور کا حلوہ")
.replace(/mango shake/gi, "آم کا شیک")
.replace(/banana shake/gi, "کیلا شیک")
.replace(/strawberry shake/gi, "اسٹرابیری شیک")
.replace(/chocolate shake/gi, "چاکلیٹ شیک")
.replace(/cold coffee/gi, "ٹھنڈی کافی")
.replace(/lassi/gi, "لسّی")
.replace(/sweet lassi/gi, "میٹھی لسّی")
.replace(/salted lassi/gi, "نمکین لسّی")
.replace(/falooda/gi, "فالودہ")
.replace(/milkshake/gi, "ملک شیک")
.replace(/rooh afza/gi, "روح افزا")
.replace(/lemonade/gi, "لیموں پانی")
.replace(/mint lemonade/gi, "پودینے والا لیموں پانی")
.replace(/orange juice/gi, "مالٹے کا رس")
.replace(/apple juice/gi, "سیب کا رس")
.replace(/carrot juice/gi, "گاجر کا رس")
.replace(/beetroot juice/gi, "چقندر کا رس")
.replace(/energy drink/gi, "انرجی ڈرنک")
.replace(/knife/gi, "چاقو")
.replace(/spoon/gi, "چمچ")
.replace(/ladle/gi, "کفگیر")
.replace(/fork/gi, "کانٹا")
.replace(/whisk/gi, "پھینٹنے والا آلہ")
.replace(/pan/gi, "پین")
.replace(/pot/gi, "دیگچی")
.replace(/wok/gi, "کڑاہی")
.replace(/pressure cooker/gi, "پریشر ککر")
.replace(/kettle/gi, "کیٹل")
.replace(/bowl/gi, "کٹورا")
.replace(/plate/gi, "پلیٹ")
.replace(/glass/gi, "گلاس")
.replace(/cup/gi, "کپ")
.replace(/mug/gi, "مگ")
.replace(/jug/gi, " جگ")
.replace(/tray/gi, "ٹرے")
.replace(/strainer/gi, "چھلنی")
.replace(/grater/gi, "کدوکش")
.replace(/chopping board/gi, "کٹنگ بورڈ")
.replace(/tongs/gi, "چمٹا")
.replace(/peeler/gi, "چھیلنے والا آلہ")
.replace(/rolling pin/gi, "بیلن")
.replace(/stove/gi, "چولہا")
.replace(/oven/gi, "اووَن")
.replace(/microwave/gi, "مائیکروویو")
.replace(/blender/gi, "بلینڈر")
.replace(/mixer/gi, "مکسر")
.replace(/grinder/gi, "گرائنڈر")
.replace(/fryer/gi, "فرائیر")
.replace(/toaster/gi, "ٹوسٹر")
.replace(/skillet/gi, "فرائنگ پین")
.replace(/serving spoon/gi, "پیش کرنے والا چمچ")
.replace(/measuring cup/gi, "ماپنے کا کپ")
.replace(/measuring spoon/gi, "ماپنے والا چمچ")
.replace(/heat/gi, "گرم کریں")
.replace(/boil/gi, "ابالیں")
.replace(/simmer/gi, "دھیمی آنچ پر پکائیں")
.replace(/steam/gi, "بھاپ دیں")
.replace(/fry/gi, "فرائی کریں")
.replace(/deep fry/gi, "ڈیپ فرائی کریں")
.replace(/shallow fry/gi, "ہلکی فرائی کریں")
.replace(/grill/gi, "گرل کریں")
.replace(/bake/gi, "بیک کریں")
.replace(/roast/gi, "روسٹ کریں")
.replace(/toast/gi, "ٹوست کریں")
.replace(/knead/gi, "گوندھیں")
.replace(/mix/gi, "مکس کریں")
.replace(/blend/gi, "بلینڈ کریں")
.replace(/stir/gi, "چمچ سے ہلائیں")
.replace(/beat/gi, "پھینٹیں")
.replace(/whip/gi, "جھاگ دار کریں")
.replace(/chop/gi, "کاٹیں")
.replace(/dice/gi, "چھوٹے ٹکڑے کریں")
.replace(/slice/gi, "باریک ٹکڑے کریں")
.replace(/peel/gi, "چھیلیں")
.replace(/grate/gi, "کدوکش کریں")
.replace(/marinate/gi, "مرینیٹ کریں")
.replace(/soak/gi, "بھگو دیں")
.replace(/cool/gi, "ٹھنڈا کریں")
.replace(/reheat/gi, "دوبارہ گرم کریں")
.replace(/drain/gi, "چھان لیں")
.replace(/strain/gi, "فلٹر کریں")
.replace(/pour/gi, "ڈالیں")
.replace(/serve/gi, "پیش کریں")
.replace(/garnish/gi, "سجاوٹ کریں")
.replace(/season/gi, "مصالحہ لگائیں")
.replace(/add/gi, "شامل کریں")
.replace(/remove/gi, "نکالیں")
.replace(/cover/gi, "ڈھانپیں")
.replace(/uncover/gi, "کھولیں")
.replace(/preheat/gi, "پہلے سے گرم کریں")
.replace(/flip/gi, "پلٹیں")
.replace(/turn off/gi, "بند کریں")
.replace(/turn on/gi, "چالو کریں")
.replace(/keep aside/gi, "الگ رکھیں")
.replace(/let it rest/gi, "رہنے دیں")
.replace(/press/gi, "دبائیں")
.replace(/grease/gi, "چکنائی لگائیں")
.replace(/melt/gi, "پگھلائیں")
.replace(/sprinkle/gi, "چھڑکیں")
.replace(/dip/gi, "ڈبونا")
.replace(/fold/gi, "موڑیں")
.replace(/stir fry/gi, "چمچ سے تلنا")
.replace(/boiling point/gi, "نقطہ ابال")
.replace(/low flame/gi, "ہلکی آنچ")
.replace(/medium flame/gi, "درمیانی آنچ")
.replace(/high flame/gi, "تیز آنچ")
.replace(/let it cook/gi, "پکنے دیں")
.replace(/wait/gi, "انتظار کریں")
.replace(/out/gi, "باہر")
.replace(/down/gi, "نیچے")
.replace(/roll/gi, "لپیٹیں")
.replace(/tip/gi, "جھکائیں")
.replace(/over/gi, "اوپر")
.replace(/piping/gi, "نالی نما")
.replace(/gently/gi, "نرمی سے")
.replace(/tightly/gi, "مضبوطی سے")
.replace(/square/gi, "مربع")
.replace(/sides/gi, "کنارے")
.replace(/layer/gi, "پرت")
.replace(/castle/gi, "قلعہ")
.replace(/squashing/gi, "دبانا")
.replace(/dip/gi, "ڈبوئیں")
.replace(/press/gi, "دبائیں")
.replace(/bring up/gi, "اوپر لائیں")
.replace(/unwrap/gi, "کھولیں")
.replace(/stick/gi, "چپکانا")
.replace(/lining/gi, "استر")
.replace(/fold/gi, "موڑیں")
.replace(/seal/gi, "بند کریں")
.replace(/edges/gi, "کنارے")
.replace(/softly/gi, "نرمی سے")
.replace(/spread/gi, "پھیلائیں")
.replace(/tuck/gi, "سمیٹیں")
.replace(/lift/gi, "اٹھائیں")
.replace(/snug/gi, "فٹ")
.replace(/ingredient/gi, "اجزاء")
.replace(/utensils/gi, "برتن")
.replace(/kitchen/gi, "باورچی خانہ")
.replace(/recipe/gi, "ترکیب")
.replace(/chef/gi, "شیف")
.replace(/cook/gi, "پکانا")
.replace(/cooked/gi, "پکا ہوا")
.replace(/cooking/gi, "پکانے")
.replace(/raw/gi, "کچا")
.replace(/meal/gi, "کھانا")
.replace(/dish/gi, "ڈش")
.replace(/flavor/gi, "ذائقہ")
.replace(/taste/gi, "ذائقہ چکھنا")
.replace(/spicy/gi, "مرچ دار")
.replace(/sweet/gi, "میٹھا")
.replace(/salty/gi, "نمکین")
.replace(/sour/gi, "کھٹا")
.replace(/bitter/gi, "کڑوا")
.replace(/savory/gi, "مزے دار")
.replace(/aroma/gi, "خوشبو")
.replace(/smell/gi, "بو")
.replace(/boiling/gi, "ابلتا ہوا")
.replace(/frying/gi, "تلنا")
.replace(/baking/gi, "بیکنگ")
.replace(/roasting/gi, "روسٹنگ")
.replace(/grilling/gi, "گرلنگ")
.replace(/steaming/gi, "بھاپ دینا")
.replace(/simmering/gi, "دھیمی آنچ پر پکانا")
.replace(/burnt/gi, "جلا ہوا")
.replace(/overcooked/gi, "زیادہ پکایا ہوا")
.replace(/undercooked/gi, "کم پکا ہوا")
.replace(/tender/gi, "نرم")
.replace(/crispy/gi, "کرسپی")
.replace(/crunchy/gi, "کرس دار")
.replace(/soft/gi, "نرم")
.replace(/hard/gi, "سخت")
.replace(/stirring/gi, "ہلانا")
.replace(/pouring/gi, "انڈیلنا")
.replace(/mixing/gi, "مکس کرنا")
.replace(/blending/gi, "بلینڈ کرنا")
.replace(/seasoning/gi, "مسالا لگانا")
.replace(/spices/gi, "مصالحے")
.replace(/herbs/gi, "جڑی بوٹیاں")
.replace(/oil/gi, "تیل")
.replace(/ghee/gi, "گھی")
.replace(/butter/gi, "مکھن")
.replace(/salt/gi, "نمک")
.replace(/pepper/gi, "کالی مرچ")
.replace(/chili/gi, "مرچ")
.replace(/turmeric/gi, "ہلدی")
.replace(/cumin/gi, "زیرہ")
.replace(/coriander/gi, "دھنیا")
.replace(/garlic/gi, "لہسن")
.replace(/ginger/gi, "ادرک")
.replace(/onion/gi, "پیاز")
.replace(/tomato/gi, "ٹماٹر")
.replace(/potato/gi, "آلو")
.replace(/rice/gi, "چاول")
.replace(/bread/gi, "روٹی")
.replace(/flour/gi, "آٹا")
.replace(/dough/gi, "گوندھا ہوا آٹا")
.replace(/yeast/gi, "خمیر")
.replace(/sugar/gi, "چینی")
.replace(/honey/gi, "شہد")
.replace(/vinegar/gi, "سرکہ")
.replace(/lemon juice/gi, "لیموں کا رس")
.replace(/water/gi, "پانی")
.replace(/milk/gi, "دودھ")
.replace(/cream/gi, "ملائی")
.replace(/cheese/gi, "پنیر")
.replace(/egg/gi, "انڈہ")
.replace(/meat/gi, "گوشت")
.replace(/chicken/gi, "مرغی")
.replace(/beef/gi, "گائے کا گوشت")
.replace(/lamb/gi, "بکرے کا گوشت")
.replace(/pork/gi, "سور کا گوشت")
.replace(/fish/gi, "مچھلی")
.replace(/seafood/gi, "سمندری غذا")
.replace(/vegetable/gi, "سبزی")
.replace(/fruit/gi, "پھل")
.replace(/carrot/gi, "گاجر")
.replace(/spinach/gi, "پالک")
.replace(/capsicum/gi, "شملہ مرچ")
.replace(/preheat/gi, "پہلے سے گرم کریں")
.replace(/oven/gi, "اوون")
.replace(/stems/gi, "ڈنٹھل")
.replace(/bunch/gi, "گچھا")
.replace(/tear/gi, "پھاڑیں")
.replace(/pieces/gi, "ٹکڑے")
.replace(/collards/gi, "پتوں والی سبزی")
.replace(/coarsely/gi, "موٹے انداز میں")
.replace(/chop/gi, "کٹائی کریں")
.replace(/combine/gi, "ملائیں")
.replace(/baking/gi, "بیکنگ")
.replace(/dish/gi, "ڈش")
.replace(/thinly/gi, "باریک")
.replace(/sliced/gi, "کٹے ہوئے")
.replace(/optional/gi, "اختیاری")
.replace(/recommended/gi, "تجویز کردہ")
.replace(/iron/gi, "لوہے کا")
.replace(/pan/gi, "پین")
.replace(/stove/gi, "چولہا")
.replace(/coat/gi, "لیپت کریں")
.replace(/drizzle/gi, "چھڑکیں")
.replace(/broth/gi, "یخنی")
.replace(/cover/gi, "ڈھانپیں")
.replace(/foil/gi, "فائل")
.replace(/bake/gi, "بیک کریں")
.replace(/wilted/gi, "مرجھایا ہوا")
.replace(/remove/gi, "نکالیں")
.replace(/season/gi, "مصالحہ لگائیں")
.replace(/continue/gi, "جاری رکھیں")
.replace(/soften/gi, "نرم ہونا")
.replace(/meanwhile/gi, "ادھر")
.replace(/heat/gi, "گرم کریں")
.replace(/prick/gi, "چبھونا")
.replace(/fork/gi, "کانٹا")
.replace(/edges/gi, "کنارے")
.replace(/through/gi, "پک چکا ہو")
.replace(/done/gi, "مکمل ہو جائیں")
.replace(/slice/gi, "ٹکڑے کریں")
.replace(/mix/gi, "مکس کریں")
.replace(/splash/gi, "چھینٹا")
.replace(/vinegar/gi, "سرکہ")
.replace(/sherry/gi, "شیری")
.replace(/wine/gi, "شراب")
.replace(/spread/gi, "پھیلائیں")
.replace(/press/gi, "دبائیں")
.replace(/whisk/gi, "پھینٹیں")
.replace(/pour/gi, "انڈیلیں")
.replace(/add/gi, "شامل کریں")
.replace(/grate/gi, "کش کریں")
.replace(/scoop/gi, "چمچ سے نکالیں")
.replace(/blend/gi, "بلینڈ کریں")
.replace(/boil/gi, "ابالیں")
.replace(/grill/gi, "گرل کریں")
.replace(/toast/gi, "ٹوسٹ کریں")
.replace(/garnish/gi, "سجاوٹ کریں")
.replace(/flip/gi, "پلٹیں")
.replace(/measure/gi, "ماپیں")
.replace(/cut/gi, "کٹ کریں")
.replace(/mince/gi, "باریک کاٹیں")
.replace(/marinate/gi, "مرینیٹ کریں")
.replace(/rest/gi, "رکھنے دیں")
.replace(/covering/gi, "ڈھانپنے")
.replace(/knead/gi, "گوندھیں")
.replace(/layer/gi, "پرت لگائیں")
.replace(/sprinkle/gi, "چھڑکاؤ کریں")
.replace(/sauté/gi, "بھونیں")
.replace(/reheat/gi, "دوبارہ گرم کریں")
.replace(/serve/gi, "پیش کریں")
.replace(/cool/gi, "ٹھنڈا کریں")
.replace(/strain/gi, "چھانیں")
.replace(/peel/gi, "چھیلیں")
.replace(/core/gi, "بیج نکالیں")
.replace(/defrost/gi, "برف پگھلائیں")
.replace(/microwave/gi, "مائیکروویو کریں")
.replace(/frozen/gi, "جما ہوا")
.replace(/crush/gi, "کچلیں")
.replace(/grease/gi, "چکنائی لگائیں")
.replace(/dough/gi, "آٹا")
.replace(/roll/gi, "بیلیں")
.replace(/whip/gi, "پھینٹیں")
.replace(/melt/gi, "پگھلائیں")
.replace(/refrigerate/gi, "فریج میں رکھیں")
.replace(/chill/gi, "ٹھنڈا کریں")
.replace(/covering/gi, "ڈھانپنا")
.replace(/firm/gi, "سخت")
.replace(/coating/gi, "پرت")
.replace(/caramelize/gi, "کریم جیسا بنائیں")
.replace(/dust/gi, "ہلکا سا چھڑکیں")
.replace(/batter/gi, "مائع مکسچر")
.replace(/thick/gi, "گاڑھا")
.replace(/thin/gi, "پتلا")
.replace(/foam/gi, "جھاگ")
.replace(/creamy/gi, "ملائم")
.replace(/crunch/gi, "کرسپپن")
.replace(/dip/gi, "ڈِپ کریں")
.replace(/fold/gi, "موڑیں")
.replace(/cling/gi, "چپکائیں")
  .replace(/\./g, "۔");
}




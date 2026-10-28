function openNav() {
  document.getElementById("mySidenav").style.width = "100%";
  document.body.style.overflow = "hidden";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.body.style.overflow = "";
}

// gallery js//
document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.querySelector('.gallery .row'); // Can be null on reservations page
    const galleryItems = galleryContainer ? Array.from(galleryContainer.querySelectorAll('.col')) : [];
    const filterButtons = document.querySelectorAll('.galleryCat .cat');
    const shuffleGallery = () => {
        for (let i = galleryItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            galleryContainer.appendChild(galleryItems[j]);
        }
    };

    const filterGallery = (category) => { // This function is safe even if galleryItems is empty
        if (category === 'all') {
            shuffleGallery();
        }

        galleryItems.forEach(item => {
            const shouldShow = category === 'all' || item.classList.contains(category);
            item.classList.toggle('show', shouldShow);
        });
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.filter;

            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterGallery(category);
        });
    });
    if (filterButtons.length > 0) {
        filterButtons[0].click();
    }

    // --- Slideshow popSlide Logic ---
    const popSlide = document.getElementById('slideshow'); 
    if (popSlide) {
        const popSlideImg = document.getElementById('slideshowImage');
        const slideNumberText = document.querySelector('.slide-number');
        const closeBtn = document.querySelector('.close-slideshow');
        const prevBtn = document.querySelector('.prev');
        const nextBtn = document.querySelector('.next');

        let currentVisibleSlides = [];
        let currentSlideIndex = 0;

        const openpopSlide = (clickedItem) => {
            currentVisibleSlides = galleryContainer ? Array.from(galleryContainer.querySelectorAll('.col.show')) : [];
            currentSlideIndex = currentVisibleSlides.indexOf(clickedItem);

            if (currentSlideIndex > -1) {
                popSlide.style.display = 'block';
                document.body.style.overflow = 'hidden';
                updateSlide();
            }
        };

        const closepopSlide = () => {
            popSlide.style.display = 'none';
            document.body.style.overflow = ''; 
        };

        const updateSlide = () => {
            const currentSlideElement = currentVisibleSlides[currentSlideIndex];
            const newSrc = currentSlideElement.querySelector('img').src;
            popSlideImg.src = newSrc;
            slideNumberText.textContent = `${currentSlideIndex + 1} / ${currentVisibleSlides.length}`;
        };

        const changeSlide = (direction) => {
            currentSlideIndex += direction;
            if (currentSlideIndex >= currentVisibleSlides.length) {
                currentSlideIndex = 0;
            } else if (currentSlideIndex < 0) {
                currentSlideIndex = currentVisibleSlides.length - 1;
            }
            updateSlide();
        };

        if (galleryContainer) {
            galleryContainer.addEventListener('click', (e) => {
                const clickedItem = e.target.closest('.col');
                if (clickedItem && clickedItem.classList.contains('show')) {
                    openpopSlide(clickedItem);
                }
            });
        }

        closeBtn.addEventListener('click', closepopSlide);
        prevBtn.addEventListener('click', () => changeSlide(-1));
        nextBtn.addEventListener('click', () => changeSlide(1));
        popSlide.addEventListener('click', (e) => { if (e.target === popSlide) closepopSlide(); });

        document.addEventListener('keydown', (e) => {
            if (popSlide.style.display === 'block') {
                if (e.key === 'Escape') closepopSlide();
                if (e.key === 'ArrowLeft') changeSlide(-1);
                if (e.key === 'ArrowRight') changeSlide(1);
            }
        });
    }

    // --- Party Package Form Logic ---
    // Define the number of options for each package
    const packageOptions = {
        'buddy': { pizzas: 3,wings: 0, salads: 0 },
        'super_buddy': { pizzas: 6, wings: 0, salads: 1 },
        'team_buddy': { pizzas: 7, wings: 0, salads: 0 },
        'mega_buddy': { pizzas: 5, wings: 1, salads: 2 }
    };

    // Store user selections for each package
    const userSelections = {};

    document.querySelectorAll('.packages-fieldset .package-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const quantityInput = item.querySelector('input[type="number"]');
        const dynamicOrderDiv = item.querySelector('.dynamic-order');

        // Only set up dynamic option generation for packages that have quantity and dynamic-order elements.
        // This correctly skips the "Order From Menu Day Of" option.
        if (!checkbox || !quantityInput || !dynamicOrderDiv) {
            return;
        }

        const packageName = checkbox.value;

        // Helper to get saved selections or create new
        function getSelections() {
            if (!userSelections[packageName]) {
                userSelections[packageName] = {};
            }
            return userSelections[packageName];
        }

        // Save current selections from DOM
        function saveSelections() {
            const selections = getSelections();
            dynamicOrderDiv.querySelectorAll('input, select').forEach(input => {
                // Determine the ID of the closest parent .collapsible-content for unique keying
                const parentCollapsibleId = input.closest('.collapsible-content')?.id;

                if (input.type === 'checkbox' || input.type === 'radio') {
                    selections[input.name + '_' + input.value + '_' + parentCollapsibleId] = input.checked;
                } else if (input.tagName === 'SELECT') {
                    selections[input.name + '_' + parentCollapsibleId] = input.value;
                }
            });
        }

        // Restore selections to DOM
        function restoreSelections() {
            const selections = getSelections();
            dynamicOrderDiv.querySelectorAll('input, select').forEach(input => {
                const parentCollapsibleId = input.closest('.collapsible-content')?.id;

                if (input.type === 'checkbox' || input.type === 'radio') {
                    const key = input.name + '_' + input.value + '_' + parentCollapsibleId;
                    if (key in selections) {
                        input.checked = selections[key];
                    }
                } else if (input.tagName === 'SELECT') {
                    const key = input.name + '_' + parentCollapsibleId;
                    if (key in selections) {
                        input.value = selections[key];
                    }
                }
            });
        }

        // Generate the dynamic options
        function generateOptions(quantity) {
            const optionsConfig = packageOptions[packageName];
            if (!packageName || !optionsConfig) {
                dynamicOrderDiv.innerHTML = ''; // Clear if no package or options
                return;
            }

            const totalPizzas = (optionsConfig.pizzas || 0) * quantity;
            const totalSalads = (optionsConfig.salads || 0) * quantity;
            const totalWings = (optionsConfig.wings || 0) * quantity;

            if (totalPizzas === 0 && totalSalads === 0 && totalWings === 0) {
                dynamicOrderDiv.innerHTML = '';
                return;
            }

            let dynamicHTML = '';
            let buttonsHTML = '';
            let itemCounter = 0;

            // --- Generate Pizza Options ---
            for (let i = 1; i <= totalPizzas; i++) {
                itemCounter++;
                const collapsedClass = itemCounter > 1 ? 'collapsed' : '';
                const currentPackageChoiceId = `${packageName}-choice-pizza-${i}`; // More specific ID

                dynamicHTML += `
                    <div class="collapsible-content ${collapsedClass}" id="${currentPackageChoiceId}">
                        <legend>Pizza Options ${i}</legend>
                        <div class="sauce-grid">
                            <div class="package-item">
                                <input type="radio" id="sauce1_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="pizza_sauce">
                                <label for="sauce1_${currentPackageChoiceId}" class="package-label">Pizza Sauce</label>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce2_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="Garlic_Butter_sauce">
                                <label for="sauce2_${currentPackageChoiceId}" class="package-label">Garlic Butter</label>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce3_radio_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="BBQ_sauce">
                                <select id="sauce3_select_${currentPackageChoiceId}" name="bbq_sauce_type_${currentPackageChoiceId}" class="package-label">
                                    <option value="BBQ Sauces">BBQ Sauces</option>
                                    <option value="Sweet BBQ Sauce">Sweet BBQ</option>
                                    <option value="Spicy BBQ Sauce">Spicy BBQ</option>
                                </select>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce4_radio_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="Buffalo">
                                <select id="sauce4_select_${currentPackageChoiceId}" name="buffalo_sauce_type_${currentPackageChoiceId}" class="package-label">
                                    <option value="Buffalo Sauces">Buffalo Sauces</option>
                                    <option value="Buffalo BBQ Sauce">Buffalo</option>
                                    <option value="Spicy Buffalo Sauce">Spicy Buffalo</option>
                                </select>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce5_radio_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="Gourmet">
                                <select id="sauce5_select_${currentPackageChoiceId}" name="gourmet_sauce_type_${currentPackageChoiceId}" class="package-label">
                                    <option value="Gourmet Sauces">Gourmet Sauces</option>
                                    <option value="Alfredo Sauce">Alfredo</option>
                                    <option value="Pesto Sauce">Pesto</option>
                                    <option value="Pesto Alfredo Sauce">Pesto Alfredo</option>
                                </select>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce7_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="Ranch">
                                <label for="sauce7_${currentPackageChoiceId}" class="package-label">Ranch</label>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce8_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="Mustard">
                                <label for="sauce8_${currentPackageChoiceId}" class="package-label">Mustard</label>
                            </div>
                            <div class="package-item">
                                <input type="radio" id="sauce9_${currentPackageChoiceId}" name="sauce_${currentPackageChoiceId}" value="no_sauce">
                                <label for="sauce9_${currentPackageChoiceId}" class="package-label">No Sauce</label>
                            </div>
                        </div>

                        <legend>Toppings & Specialties</legend>
                        <div class="toppings-grid">
                            <div class="package-item">
                                <input type="checkbox" id="basic1_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Pepperoni">
                                <label for="basic1_${currentPackageChoiceId}" class="package-label">Pepperoni</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic2_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Sausage">
                                <label for="basic2_${currentPackageChoiceId}" class="package-label">Sausage</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic3_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Ham">
                                <label for="basic3_${currentPackageChoiceId}" class="package-label">Ham</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic4_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Bacon Bits">
                                <label for="basic4_${currentPackageChoiceId}" class="package-label">Bacon Bits</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic5_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Meatballs">
                                <label for="basic5_${currentPackageChoiceId}" class="package-label">Meatballs</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic6_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Hamburger">
                                <label for="basic6_${currentPackageChoiceId}" class="package-label">Hamburger</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic7_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Salami">
                                <label for="basic7_${currentPackageChoiceId}" class="package-label">Salami</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic8_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Mushroom">
                                <label for="basic8_${currentPackageChoiceId}" class="package-label">Mushroom</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic9_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Olives">
                                <label for="basic9_${currentPackageChoiceId}" class="package-label">Olives</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic10_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Onion">
                                <label for="basic10_${currentPackageChoiceId}" class="package-label">Onion</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic11_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Green Pepper">
                                <label for="basic11_${currentPackageChoiceId}" class="package-label">Green Pepper</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic12_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Tomato">
                                <label for="basic12_${currentPackageChoiceId}" class="package-label">Tomato</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic13_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Red Onion">
                                <label for="basic13_${currentPackageChoiceId}" class="package-label">Red Onion</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic14_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Spinach">
                                <label for="basic14_${currentPackageChoiceId}" class="package-label">Spinach</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic15_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Pineapple">
                                <label for="basic15_${currentPackageChoiceId}" class="package-label">Pineapple</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic16_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Jalapeno">
                                <label for="basic16_${currentPackageChoiceId}" class="package-label">Jalapeno</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic17_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Pepperoncini">
                                <label for="basic17_${currentPackageChoiceId}" class="package-label">Pepperoncini</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic18_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Fresh Garlic">
                                <label for="basic18_${currentPackageChoiceId}" class="package-label">Fresh Garlic</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic19_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Roasted Garlic">
                                <label for="basic19_${currentPackageChoiceId}" class="package-label">Roasted Garlic</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic20_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Basil">
                                <label for="basic20_${currentPackageChoiceId}" class="package-label">Basil</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic21_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Plum Tomato">
                                <label for="basic21_${currentPackageChoiceId}" class="package-label">Plum Tomato</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="basic22_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Refried Beans">
                                <label for="basic22_${currentPackageChoiceId}" class="package-label">Refried Beans</label>
                            </div>
                        </div>

                        <legend>Gourmet Toppings</legend>
                        <div class="toppings-grid">
                            <div class="package-item">
                                <input type="checkbox" id="gromet1_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Chicken">
                                <label for="gromet1_${currentPackageChoiceId}" class="package-label">Chicken</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet2_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Shrimp">
                                <label for="gromet2_${currentPackageChoiceId}" class="package-label">Shrimp</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet3_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Anchovies">
                                <label for="gromet3_${currentPackageChoiceId}" class="package-label">Anchovies</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet4_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Artichokes">
                                <label for="gromet4_${currentPackageChoiceId}" class="package-label">Artichokes</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet5_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Extra Cheese">
                                <label for="gromet5_${currentPackageChoiceId}" class="package-label">Extra Cheese</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet6_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Feta Cheese">
                                <label for="gromet6_${currentPackageChoiceId}" class="package-label">Feta Cheese</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet7_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Cheddar Cheese">
                                <label for="gromet7_${currentPackageChoiceId}" class="package-label">Cheddar Cheese</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet8_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Blue Cheese">
                                <label for="gromet8_${currentPackageChoiceId}" class="package-label">Blue Cheese</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet9_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Smoked Mozzarella">
                                <label for="gromet9_${currentPackageChoiceId}" class="package-label">Smoked Mozzarella</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet10_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Grilled Onion">
                                <label for="gromet10_${currentPackageChoiceId}" class="package-label">Grilled Onion</label>
                            </div>
                            <div class="package-item">
                                <input type="checkbox" id="gromet11_${currentPackageChoiceId}" name="topping_${currentPackageChoiceId}[]" value="Cashews">
                                <label for="gromet11_${currentPackageChoiceId}" class="package-label">Cashews</label>
                            </div>
                        </div>

                        <fieldset class="specialty-options-fieldset">
                            <div class="specialty-options-header">
                                <input type="checkbox" id="specialty-toggle_${currentPackageChoiceId}" name="specialty_toggle_${currentPackageChoiceId}" class="specialty-toggle-checkbox">
                                <label for="specialty-toggle_${currentPackageChoiceId}" class="package-label">* Upgrade to a Specialty Pizza</label>
                            </div>
                            <div class="specialty-options-content collapsed">
                                <div class="specialty-grid">
                                    <div class="package-item">
                                        <input type="radio" id="specialty1_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Best Buddy">
                                        <label for="specialty1_${currentPackageChoiceId}" class="package-label">Best Buddy</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty2_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="B.L.T. Pizza">
                                        <label for="specialty2_${currentPackageChoiceId}" class="package-label">BLT Pizza</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty3_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Bud-E-Que">
                                        <label for="specialty3_${currentPackageChoiceId}" class="package-label">Bud-E-Que</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty4_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Buffalo Buddy">
                                        <label for="specialty4_${currentPackageChoiceId}" class="package-label">Buffalo Buddy</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty5_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Butcher Block">
                                        <label for="specialty5_${currentPackageChoiceId}" class="package-label">Butcher Block</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty6_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Chicken Parmesan">
                                        <label for="specialty6_${currentPackageChoiceId}" class="package-label">Chicken Parmesan</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty7_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Everything">
                                        <label for="specialty7_${currentPackageChoiceId}" class="package-label">Everything</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty8_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Five Cheese">
                                        <label for="specialty8_${currentPackageChoiceId}" class="package-label">Five Cheese</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty9_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Mi Amigo">
                                        <label for="specialty9_${currentPackageChoiceId}" class="package-label">Mi Amigo</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty10_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Midnight Snack">
                                        <label for="specialty10_${currentPackageChoiceId}" class="package-label">Midnight Snack</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty11_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Paisano">
                                        <label for="specialty11_${currentPackageChoiceId}" class="package-label">Paisano</label>
                                    </div>
                                    <div class="package-item">
                                        <input type="radio" id="specialty12_${currentPackageChoiceId}" name="specialty_choice_${currentPackageChoiceId}" value="Veggie">
                                        <label for="specialty12_${currentPackageChoiceId}" class="package-label">Veggie</label>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                `;
                buttonsHTML += `
                    <button type="button" class="package-choice-btn" data-target="${currentPackageChoiceId}">Pizza ${i}</button>
                `;
            }

            // --- Generate Salad Options ---
            for (let i = 1; i <= totalSalads; i++) {
                itemCounter++;
                const collapsedClass = itemCounter > 1 ? 'collapsed' : '';
                const currentPackageChoiceId = `${packageName}-choice-salad-${i}`; // More specific ID

                dynamicHTML += `
                    <div class="collapsible-content ${collapsedClass}" id="${currentPackageChoiceId}">
                        <legend>Salad Options ${i}</legend>
                        <div class="salad-options-grid">

                            <div class="package-item">
                                <input type="radio" id="salad_type_dinner_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="Dinner">
                                <label for="salad_type_dinner_${currentPackageChoiceId}" class="package-label">Dinner Salad</label>
                            </div>
                            
                            <div class="package-item">
                                <input type="radio" id="salad_type_caesar_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="Caesar">
                                <label for="salad_type_caesar_${currentPackageChoiceId}" class="package-label">Caesar Salad</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="salad_type_chicken_ceaser_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="Chicken Ceaser">
                                <label for="salad_type_chicken_ceaser_${currentPackageChoiceId}" class="package-label">Chicken Ceaser Salad</label>
                            </div>
                            
                            <div class="package-item">
                                <input type="radio" id="salad_type_cranberry_walnut_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="Cranberry Walnut">
                                <label for="salad_type_cranberry_walnut_${currentPackageChoiceId}" class="package-label">Cranberry Walnut Salad</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="salad_type_antipasto_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="Antipasto">
                                <label for="salad_type_antipasto_${currentPackageChoiceId}" class="package-label">Antipasto Salad</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="salad_type_house_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="House">
                                <label for="salad_type_house_${currentPackageChoiceId}" class="package-label">House Salad</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="salad_type_the_buddy_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="The Buddy">
                                <label for="salad_type_the_buddy_${currentPackageChoiceId}" class="package-label">The Buddy Salad</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="salad_type_veggie_${currentPackageChoiceId}" name="salad_type_${currentPackageChoiceId}" value="Veggie">
                                <label for="salad_type_veggie_${currentPackageChoiceId}" class="package-label">Veggie Salad</label>
                            </div>

                        </div>

                        <legend>Dressing Options</legend>
                        <div class="salad-options-grid">

                            <div class="package-item">
                                <input type="radio" id="dressing_ranch_${currentPackageChoiceId}" name="dressing_${currentPackageChoiceId}" value="Ranch">
                                <label for="dressing_ranch_${currentPackageChoiceId}" class="package-label">Ranch</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="dressing_blue_cheese_${currentPackageChoiceId}" name="dressing_${currentPackageChoiceId}" value="Blue Cheese">
                                <label for="dressing_blue_cheese_${currentPackageChoiceId}" class="package-label">Blue Cheese</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="dressing_italian_${currentPackageChoiceId}" name="dressing_${currentPackageChoiceId}" value="Italian">
                                <label for="dressing_italian_${currentPackageChoiceId}" class="package-label">Italian</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="dressing_ceaser_${currentPackageChoiceId}" name="dressing_${currentPackageChoiceId}" value="Ceaser">
                                <label for="dressing_ceaser_${currentPackageChoiceId}" class="package-label">Ceaser</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="dressing_raspberry_vinaigrette_${currentPackageChoiceId}" name="dressing_${currentPackageChoiceId}" value="Raspberry Vinaigrette">
                                <label for="dressing_raspberry_vinaigrette_${currentPackageChoiceId}" class="package-label">Raspberry Vinaigrette</label>
                            </div>

                        </div>
                    </div>
                `;
                buttonsHTML += `
                    <button type="button" class="package-choice-btn" data-target="${currentPackageChoiceId}">Salad ${i}</button>
                `;
            }

            // --- Generate Wing Options ---
            for (let i = 1; i <= totalWings; i++) {
                itemCounter++;
                const collapsedClass = itemCounter > 1 ? 'collapsed' : '';
                const currentPackageChoiceId = `${packageName}-choice-wing-${i}`;

                dynamicHTML += `
                    <div class="collapsible-content ${collapsedClass}" id="${currentPackageChoiceId}">
                        <legend>Wing Sauce Options ${i}</legend>
                        <div class="package-item half-and-half-wrapper">
                            <input type="checkbox" id="half-and-half-toggle_${currentPackageChoiceId}" class="half-and-half-toggle">
                            <label for="half-and-half-toggle_${currentPackageChoiceId}" class="package-label">Half & Half (Select 2)</label>
                        </div>
                        <div class="wing-options-grid" id="wing-flavors-container_${currentPackageChoiceId}">

                            <div class="package-item">
                                <input type="radio" id="wing_flavor_bbq_${currentPackageChoiceId}" name="wing_flavor_${currentPackageChoiceId}" value="BBQ">
                                <label for="wing_flavor_bbq_${currentPackageChoiceId}" class="package-label">BBQ</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="wing_flavor_spicy_bbq_${currentPackageChoiceId}" name="wing_flavor_${currentPackageChoiceId}" value="Spicy BBQ">
                                <label for="wing_flavor_spicy_bbq_${currentPackageChoiceId}" class="package-label">Spicy BBQ</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="wing_flavor_buffalo_${currentPackageChoiceId}" name="wing_flavor_${currentPackageChoiceId}" value="Buffalo">
                                <label for="wing_flavor_buffalo_${currentPackageChoiceId}" class="package-label">Buffalo</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="wing_flavor_garlic_parmesan_${currentPackageChoiceId}" name="wing_flavor_${currentPackageChoiceId}" value="Garlic Parmesan">
                                <label for="wing_flavor_garlic_parmesan_${currentPackageChoiceId}" class="package-label">Garlic Parmesan</label>
                            </div>

                            <div class="package-item">
                                <input type="radio" id="wing_flavor_plain_${currentPackageChoiceId}" name="wing_flavor_${currentPackageChoiceId}" value="Plain">
                                <label for="wing_flavor_plain_${currentPackageChoiceId}" class="package-label">Plain</label>
                            </div>

                        </div>

                        <legend>Dipping Sauce Options</legend>
                        <div class="wing-options-grid">
                            <div class="package-item">
                                   <input type="radio" id="dip_flavor_ranch_${currentPackageChoiceId}" name="dip_flavor_${currentPackageChoiceId}" value="Ranch">
                                   <label for="dip_flavor_ranch_${currentPackageChoiceId}" class="package-label">Ranch</label>
                            </div>

                            <div class="package-item">
                                   <input type="radio" id="dip_flavor_blue_cheese_${currentPackageChoiceId}" name="dip_flavor_${currentPackageChoiceId}" value="Blue Cheese">
                                   <label for="dip_flavor_blue_cheese_${currentPackageChoiceId}" class="package-label">Blue Cheese</label>
                            </div>
                        </div>
        

                    </div>
                `;
                buttonsHTML += `
                    <button type="button" class="package-choice-btn" data-target="${currentPackageChoiceId}">Wing ${i}</button>
                `;
            }

            dynamicOrderDiv.innerHTML = `
                <div class="pagination">
                    
                </div>
            `;

            const buttonsContainer = document.createElement('div');
            const paginationContainer = dynamicOrderDiv.querySelector('.pagination');
            paginationContainer.innerHTML = `<button type="button" class="pagination-btn" data-direction="prev">&laquo;</button>
            
            <span class="pagination-info"></span><button type="button" class="pagination-btn" data-direction="next">&raquo;</button>`;
            buttonsContainer.classList.add('package-choice-buttons-container');
            buttonsContainer.innerHTML = buttonsHTML;
            dynamicOrderDiv.prepend(buttonsContainer); 

            const contentContainer = document.createElement('div');
            contentContainer.innerHTML = dynamicHTML;
            dynamicOrderDiv.insertBefore(contentContainer, paginationContainer);


            // Re-attach event listeners after HTML is updated
            const buttons = dynamicOrderDiv.querySelectorAll('.package-choice-btn');
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    const targetId = this.dataset.target;
                    togglePackageChoice(targetId); // Calls the global function
                    updatePagination(dynamicOrderDiv, targetId);
                });
            });

            // Re-attach listeners for saving selections
            dynamicOrderDiv.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('change', saveSelections);
            });

            restoreSelections(); // Restore saved state after generating HTML

            
            const firstCollapsible = dynamicOrderDiv.querySelector('.collapsible-content');
            if (firstCollapsible) {
                firstCollapsible.classList.remove('collapsed');
                updatePagination(dynamicOrderDiv, firstCollapsible.id);
            }
        }

        // Checkbox logic
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                quantityInput.disabled = false;
                if (parseInt(quantityInput.value, 10) < 1) quantityInput.value = 1; 
                generateOptions(parseInt(quantityInput.value, 10));
            } else {
                saveSelections(); 
                quantityInput.disabled = true;
                quantityInput.value = '0';
                dynamicOrderDiv.innerHTML = ''; 
            }
        });

        // Quantity input logic
        quantityInput.addEventListener('input', () => {
            if (checkbox.checked) {
                let val = parseInt(quantityInput.value, 10);
                if (isNaN(val) || val < 1) val = 1; 
                quantityInput.value = val;
                saveSelections(); 
                generateOptions(val); 
            }
        });

        // Pagination logic for "previous" and "next" buttons
        dynamicOrderDiv.addEventListener('click', (event) => {
            if (event.target.classList.contains('pagination-btn')) {
                const direction = event.target.dataset.direction;
                const visibleContent = dynamicOrderDiv.querySelector('.collapsible-content:not(.collapsed)');
                if (!visibleContent) return;

                const allContents = Array.from(dynamicOrderDiv.querySelectorAll('.collapsible-content'));
                const currentIndex = allContents.indexOf(visibleContent);

                let nextIndex = currentIndex;
                if (direction === 'next') {
                    nextIndex = (currentIndex + 1) % allContents.length;
                } else if (direction === 'prev') {
                    nextIndex = (currentIndex - 1 + allContents.length) % allContents.length;
                }

                if (allContents[nextIndex]) {
                    togglePackageChoice(allContents[nextIndex].id);
                    updatePagination(dynamicOrderDiv, allContents[nextIndex].id);
                }
            }
        });

        // Specialty options collapse
        dynamicOrderDiv.addEventListener('change', (event) => {
            if (event.target.classList.contains('specialty-toggle-checkbox')) {
                const header = event.target.closest('.specialty-options-header');
                if (header) {
                    const content = header.nextElementSibling;
                    content.classList.toggle('collapsed', !event.target.checked);
                }
            }

            // Handle Half & Half wing flavor toggle
            if (event.target.classList.contains('half-and-half-toggle')) {
                const toggle = event.target;
                const wingOptionsContainer = toggle.closest('.collapsible-content');
                if (wingOptionsContainer) {
                    const currentPackageChoiceId = wingOptionsContainer.id;
                    const flavorsContainer = wingOptionsContainer.querySelector(`#wing-flavors-container_${currentPackageChoiceId}`);
                    
                    if (flavorsContainer) {
                        const flavorInputs = flavorsContainer.querySelectorAll('input');
                        const isHalfAndHalf = toggle.checked;

                        flavorInputs.forEach(input => {
                            input.type = isHalfAndHalf ? 'checkbox' : 'radio';
                            input.name = isHalfAndHalf ? `wing_flavor_${currentPackageChoiceId}[]` : `wing_flavor_${currentPackageChoiceId}`;
                            if (!isHalfAndHalf) {
                                input.checked = false; // Reset selection when turning off half-and-half
                            }
                        });
                    }
                }
            }

            // Limit wing flavor checkbox selections to 2
            if (event.target.type === 'checkbox' && event.target.name.startsWith('wing_flavor_') && event.target.name.endsWith('[]')) {
                const flavorsContainer = event.target.closest('.wing-options-grid');
                const checkedCount = flavorsContainer.querySelectorAll('input[type="checkbox"]:checked').length;
                if (checkedCount > 2) {
                    alert('You can only select up to two flavors for Half & Half.');
                    event.target.checked = false;
                }
            }
        });
        
        if (checkbox.checked) {
            quantityInput.disabled = false;
            generateOptions(parseInt(quantityInput.value, 10) || 1);
        } else {
            quantityInput.disabled = true;
            
        }

    });

    // --- Date and Time Validation for Reservation Form ---
    const dateInput = document.getElementById('date');
    const timeDisplayInput = document.getElementById('time-display');
    const timeValueInput = document.getElementById('time');
    const timeDropdown = document.getElementById('time-picker-dropdown');

    if (dateInput && timeDisplayInput && timeValueInput && timeDropdown) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        dateInput.setAttribute('min', minDate);

        // Helper function to generate and populate time slots in the custom dropdown
        const populateTimeSlots = (startTime, endTime, intervalMinutes) => {
            timeDropdown.innerHTML = ''; 
            let [startHour, startMinute] = startTime.split(':').map(Number);
            let [endHour, endMinute] = endTime.split(':').map(Number);
            let currentTime = new Date();
            currentTime.setHours(startHour, startMinute, 0, 0);
            let endTimeObj = new Date();
            endTimeObj.setHours(endHour, endMinute, 0, 0);

            while (currentTime <= endTimeObj) {
                let hours = currentTime.getHours();
                let minutes = currentTime.getMinutes();
                const displayTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const valueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                
                const timeSlotDiv = document.createElement('div');
                timeSlotDiv.className = 'time-slot';
                timeSlotDiv.textContent = displayTime;
                timeSlotDiv.dataset.value = valueTime;
                timeDropdown.appendChild(timeSlotDiv);

                currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
            }
        };

        // Populate time slots when a date is selected
        dateInput.addEventListener('change', () => {
            const selectedDate = new Date(dateInput.value);
            const dayOfWeek = selectedDate.getUTCDay(); // 0=Sun, 6=Sat

            // This was the source of the bug. The line was incomplete.
            // This now correctly sets the last available party START time based on the day of the week.
            // Fri/Sat (5/6) close at 10 PM, so the last 2-hour party can start at 8 PM (20:00).
            // Sun-Thurs (0-4) close at 8 PM, so the last 2-hour party can start at 6 PM (18:00).
            const endTime = (dayOfWeek === 5 || dayOfWeek === 6) ? '20:00' : '18:00';
            populateTimeSlots('11:00', endTime, 30); // Generate slots every 30 minutes
            timeDisplayInput.disabled = false;
            timeDisplayInput.placeholder = 'Select a time...';
            timeDisplayInput.value = '';
            timeValueInput.value = '';
        });

        // Show/hide the custom dropdown
        timeDisplayInput.addEventListener('click', () => {
            if (!timeDisplayInput.disabled) {
                timeDropdown.classList.toggle('show');
            }
        });

        // Handle selection from the custom dropdown
        timeDropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('time-slot')) {
                timeDisplayInput.value = e.target.textContent;
                timeValueInput.value = e.target.dataset.value;
                timeDropdown.classList.remove('show');
            }
        });

        // Close dropdown if clicking outside
        document.addEventListener('click', (e) => {
            if (!timeDisplayInput.contains(e.target) && !timeDropdown.contains(e.target)) {
                timeDropdown.classList.remove('show');
            }
        });
    }

    // --- Reservation Form Submission Logic ---
    const reservationForm = document.getElementById('reservation-form');

    if (reservationForm) {
        // Find the testing container, but don't make the form's functionality dependent on it.
        const outputContainer = document.getElementById('form-output-container');

        reservationForm.addEventListener('submit', (event) => {
            event.preventDefault(); // IMPORTANT: This stops the form from reloading the page

            const submittedData = collectFormData(reservationForm);

            // 1. Log to console for debugging
            console.log('Form Data:', submittedData);

            // 2. If the testing container exists, show a "submitting" message.
            if (outputContainer) {
                outputContainer.innerHTML = '<h3>Submitting reservation...</h3>';
            }

            // 3. Send data to the backend server
            fetch('/api/create-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submittedData),
            })
            .then(response => response.json())
            .then(data => {
                // If the testing container exists, display the server response in it.
                if (outputContainer) {
                    outputContainer.innerHTML = `<h3>Server Response:</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
                }
                alert(data.message || 'Submission received.');
            })
            .catch(error => {
                console.error('Error submitting form:', error);
                if (outputContainer) {
                    outputContainer.innerHTML = `<h3 style="color:red;">Error:</h3><p>Could not submit reservation. Please ensure the server is running and try again.</p>`;
                }
                alert('An error occurred while submitting the reservation.');
            });
        });
    }

    // --- Contact Form Submission Logic (for index.html and about.html) ---
    const contactForms = document.querySelectorAll('#contact-form');
    contactForms.forEach(form => {
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // Basic validation
                if (!data.firstname || !data.email || !data.subject) {
                    alert('Please fill out your first name, email, and message.');
                    return;
                }

                const submitButton = form.querySelector('input[type="submit"]');
                submitButton.value = 'Sending...';
                submitButton.disabled = true;

                fetch('/api/contact-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(result => {
                    alert(result.message || 'Your message has been sent!');
                    form.reset();
                })
                .catch(error => {
                    console.error('Error submitting contact form:', error);
                    alert('An error occurred while sending your message. Please try again later.');
                })
                .finally(() => {
                    submitButton.value = 'Submit';
                    submitButton.disabled = false;
                });
            });
        }
    });

    // --- Auto-formatting for payment fields on reservations page ---
    const cardInput = document.getElementById('tmpcrd');
    const expDateInput = document.getElementById('expdate');

    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            // Remove all non-digit characters
            let rawValue = e.target.value.replace(/\D/g, '');
            // Group into sets of 4 and join with a hyphen
            let formattedValue = rawValue.match(/.{1,4}/g)?.join('-') || '';
            // Update the input value, ensuring it doesn't exceed the standard length
            e.target.value = formattedValue.substring(0, 19);
        });
    }

    if (expDateInput) {
        expDateInput.addEventListener('input', (e) => {
            let rawValue = e.target.value.replace(/\D/g, '');
            if (rawValue.length > 2) {
                // Insert a slash after the month and limit the year to 2 digits
                rawValue = rawValue.substring(0, 2) + '/' + rawValue.substring(2, 4);
            }
            e.target.value = rawValue;
        });
    }

    // --- Other Page Listeners ---
    const mapLink = document.getElementById('dynamicMapLink');
    if (mapLink) {
        mapLink.addEventListener('click', function(e) {
            e.preventDefault();
            var address = encodeURIComponent('My Buddies Pizza, Lake Elsinore, CA');
            var ua = navigator.userAgent || navigator.vendor || window.opera;
            if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
                window.open('https://maps.apple.com/?q=' + address, '_blank');
            } else {
                window.open('https://www.google.com/maps/search/?api=1&query=' + address, '_blank');
            }
        });
    }

    const menuButton = document.querySelector('.full-menu');
    if (menuButton) {
        menuButton.addEventListener('click', function(e) {
            const confirmed = confirm('Do you want to open the full menu in a new tab?');
            if (!confirmed) {
                e.preventDefault();
            }
        });
    }

    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 40) {
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }
    });
}); 

function generateGoogleCalendarLink(data) {
    if (!data.date || !data.time) {
        alert('Please select a valid date and time to generate a calendar link.');
        return null;
    }

    const title = `Party Reservation: ${data.group || data.firstname}`;
    
    // Date and time processing
    const startTimeStr = `${data.date}T${data.time}`;
    const startDate = new Date(startTimeStr);
    if (isNaN(startDate.getTime())) {
        console.error("Invalid date or time for calendar link:", startTimeStr);
        return null;
    }
    // Assuming a 2-hour party duration based on the rules
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    // Format dates for Google Calendar URL (YYYYMMDDTHHMMSSZ)
    const toGoogleISO = (date) => date.toISOString().replace(/[-:.]/g, '').slice(0, -4) + 'Z';
    const dates = `${toGoogleISO(startDate)}/${toGoogleISO(endDate)}`;

    const details = `Reservation Details:\n` +
                    `Name: ${data.firstname} ${data.lastname}\n` +
                    `Email: ${data.email}\n` +
                    `Phone: ${data.phone}\n` +
                    `Number of People: ${data.amtppl}\n\n` +
                    `Order Details:\n` +
                    `${JSON.stringify(data.packages, null, 2)}`;

    const location = 'My Buddies Pizza, Lake Elsinore, CA';
    const guests = data.email || ''; // Add the customer's email as a guest

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${encodeURIComponent(dates)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&add=${encodeURIComponent(guests)}`;
}

function collectFormData(formElement) {
    const submittedData = {};
    const formData = new FormData(formElement);

    // Basic form fields
    for (let [key, value] of formData.entries()) {
        // Exclude package-related fields that will be handled separately
        if (!key.startsWith('packages') && !key.startsWith('qty_')) {
            submittedData[key] = value;
        }
    }

    submittedData.packages = {};

    const checkedPackages = formElement.querySelectorAll('.packages-fieldset .package-item > input[type="checkbox"]:checked');

    checkedPackages.forEach(pkgCheckbox => {
        // Get the display name from the label, not the value, for cleaner output
        const packageLabel = formElement.querySelector(`label[for="${pkgCheckbox.id}"]`);
        if (!packageLabel) return;
        const packageLabelText = packageLabel.textContent.split(':')[0].trim(); // "The Buddy Package: $130" -> "The Buddy Package"
        const packageItem = pkgCheckbox.closest('.package-item');
        const dynamicOrderDiv = packageItem.querySelector('.dynamic-order');
        const quantityInput = packageItem.querySelector('input[type="number"]');
        const quantity = quantityInput ? quantityInput.value : 'N/A';

        if (packageLabelText === 'Order From Menu Day Of') {
            submittedData.packages[packageLabelText] = { note: "Customer will order from the menu on the day of the party." };
            return; // Skip to the next package
        }

        submittedData.packages[packageLabelText] = {
            quantity: quantity,
            items: []
        };

        if (!dynamicOrderDiv) return;

        const allItems = dynamicOrderDiv.querySelectorAll('.collapsible-content');

        allItems.forEach(itemDiv => {
            const itemData = {
                id: itemDiv.id,
                name: itemDiv.querySelector('legend').textContent,
                options: {}
            };

            // Correctly collect data by iterating through inputs, not using new FormData on a div.
            itemDiv.querySelectorAll('input, select').forEach(input => {
                let cleanKey = input.name.replace(`_${itemDiv.id}`, '').replace(/\[\]$/, '');

                // Skip toggles, we only want the selections
                if (cleanKey.includes('toggle')) return;

                // Map machine-readable names to human-readable ones for the final JSON
                const keyMap = {
                    'topping': 'toppings',
                    'specialty_choice': 'specialty_pizza',
                    'wing_flavor': 'wing_flavors',
                    'dip_flavor': 'dipping_sauce',
                    'salad_type': 'salad_type',
                    'dressing': 'dressing',
                    'sauce': 'pizza_sauce'
                };
                cleanKey = keyMap[cleanKey] || cleanKey;

                if (input.type === 'radio') {
                    if (input.checked) {
                        itemData.options[cleanKey] = input.value;
                    }
                } else if (input.type === 'checkbox') {
                    if (input.checked) {
                        if (!itemData.options[cleanKey]) itemData.options[cleanKey] = [];
                        itemData.options[cleanKey].push(input.value);
                    }
                } else if (input.tagName === 'SELECT') {
                    if (input.value && !input.value.toLowerCase().includes('sauces')) {
                        itemData.options[cleanKey] = input.value;
                    }
                }
            });

            if (Object.keys(itemData.options).length > 0) {
                submittedData.packages[packageLabelText].items.push(itemData);
            }
        });
    });

    return submittedData;
}

// Global function for toggling collapsible content visibility
function togglePackageChoice(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return; // Ensure element exists

    const parentDynamicOrderDiv = element.closest('.dynamic-order');
    if (!parentDynamicOrderDiv) return; 

    
    const allCollapsibleContent = parentDynamicOrderDiv.querySelectorAll('.collapsible-content');
    allCollapsibleContent.forEach(content => {
        if (content.id !== elementId) {
            content.classList.add('collapsed');
        }
    });

    element.classList.remove('collapsed');
}

// Global function to update pagination display (e.g., "buddy= 1 of 3")
function updatePagination(dynamicOrderDiv, currentElementId) {
    const allContents = Array.from(dynamicOrderDiv.querySelectorAll('.collapsible-content'));
    const currentIndex = allContents.findIndex(content => content.id === currentElementId);
    const paginationInfoSpan = dynamicOrderDiv.querySelector('.pagination-info');

    if (paginationInfoSpan && allContents.length > 0) {
        paginationInfoSpan.textContent = `${currentIndex + 1} of ${allContents.length}`;
    }
}

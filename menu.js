document.addEventListener('DOMContentLoaded', function() {

    // --- CATEGORY FILTERING LOGIC ---

    const filterButtons = document.querySelectorAll('.menuCat .cat');
    const menuItems = document.querySelectorAll('.menu .col'); // Select all individual menu item columns

    /**
     * Shows menu items that match the selected category and hides all others.
     * It works by adding a 'show' class, which your menu.css uses to make items visible.
     * @param {string} category - The category to display (e.g., 'pizzas', 'starters').
     */
    function filterMenu(category) {
        menuItems.forEach(item => {
            const parentContainer = item.closest('.col-container');
            let shouldShow = false;

            if (category === 'wings') {
                // Only show items that have the 'wings' class.
                shouldShow = item.classList.contains('wings');
            } else if (parentContainer && parentContainer.classList.contains(category)) {
                // For other categories, show the item if it's in the right container,
                // but explicitly hide it if it's a wing item and the category is 'starters'.
                shouldShow = !(category === 'starters' && item.classList.contains('wings'));
            }

            if (shouldShow) {
                item.classList.add('show');
            } else {
                item.classList.remove('show');
            }
        });
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state on buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            // Filter the menu based on the button's data-filter attribute
            const category = this.getAttribute('data-filter');
            filterMenu(category);
        });
    });

    // Set the initial view based on the active button when the page loads.
    const initiallyActiveButton = document.querySelector('.menuCat .cat.active');
    if (initiallyActiveButton) {
        const initialCategory = initiallyActiveButton.getAttribute('data-filter');
        filterMenu(initialCategory);
    }
});
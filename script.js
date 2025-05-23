// script.js
window.onload = () => {
    console.log("WebAR application script loaded.");
    console.log("A-Frame scene and AR.js should be initializing.");

    const scene = document.querySelector('a-scene');
    if (scene) {
        console.log("A-Scene found:", scene);
        if (scene.hasLoaded) {
            console.log("A-Scene is already loaded.");
            checkAREntities();
        } else {
            scene.addEventListener('loaded', () => {
                console.log("A-Scene has loaded.");
                checkAREntities();
            });
        }

        scene.addEventListener('arjs-video-loaded', () => {
            console.log("AR.js video feed initialized.");
        });

        scene.addEventListener('arjs-nft-loaded', (event) => {
            console.log("NFT marker loaded:", event.detail.name);
        });
        
        scene.addEventListener('arjs-marker-found', (event) => {
            console.log("Marker found:", event.detail.marker.id, event.detail.marker.type);
        });

        scene.addEventListener('arjs-marker-lost', (event) => {
            console.log("Marker lost:", event.detail.marker.id, event.detail.marker.type);
        });

    } else {
        console.error("A-Scene not found in the document.");
    }
};

function checkAREntities() {
    const marker = document.querySelector('a-marker');
    if (marker) {
        console.log("a-marker found:", marker);
        console.log("Marker type:", marker.getAttribute('type'));
        console.log("Marker URL:", marker.getAttribute('url'));
        
        marker.addEventListener('markerFound', () => {
            console.log('Marker with pattern', marker.getAttribute('url'), 'found.');
            // You can add more dynamic behavior here
        });

        marker.addEventListener('markerLost', () => {
            console.log('Marker with pattern', marker.getAttribute('url'), 'lost.');
            // You can add behavior for when the marker is lost
        });

    } else {
        console.error("a-marker not found. Ensure it is correctly defined in your HTML.");
    }

    const model = document.querySelector('#animated-model');
    if (model) {
        console.log("Animated model found:", model);
        console.log("Model source:", model.getAttribute('gltf-model'));
        console.log("Model position:", model.getAttribute('position'));
        console.log("Model scale:", model.getAttribute('scale'));
        
        const animation = model.getAttribute('animation');
        if (animation) {
            console.log("Model animation properties:", animation);
        } else {
            console.warn("Animation component not found on the model, but it should be there.");
        }

        // Check if the model has loaded - this event is emitted by gltf-model component
        // Moved this to the DOMContentLoaded to also manage addToCartBtn state
        // model.addEventListener('model-loaded', () => {
        //     console.log("3D Model successfully loaded!");
        //     const addToCartBtn = document.getElementById('addToCartBtn');
        //     if (addToCartBtn) addToCartBtn.disabled = false;
            
        //     const currentAnimation = model.getAttribute('animation__autoplay'); 
        //     if (currentAnimation && model.components['animation__autoplay']) {
        //          console.log("Animation should be playing or will start based on startEvents.");
        //          // model.components['animation__autoplay'].play(); // Ensure it plays if it was paused/stopped
        //     } else if (currentAnimation) {
        //         console.log("Animation is present but might be explicitly disabled or waiting for a start event.", currentAnimation);
        //     }
        // });
        // model.addEventListener('model-error', (event) => {
        //     console.error("Error loading 3D Model:", event.detail.src);
        //     const addToCartBtn = document.getElementById('addToCartBtn');
        //     if (addToCartBtn) addToCartBtn.disabled = true;
        // });

    } else {
        console.error("Animated model (#animated-model) not found. Ensure it is correctly defined within the a-marker.");
    }

    const camera = document.querySelector('a-entity[camera]');
    if (camera) {
        console.log("Camera entity found:", camera);
    } else {
        console.error("Camera entity not found.");
    }
}


AFRAME.registerComponent('manual-rotation', {
  schema: {
    sensitivity: { type: 'number', default: 0.4 } // Degrees per pixel
  },

  init: function () {
    this.isDragging = false;
    this.previousClientX = 0;
    this.modelEntity = this.el; // The entity this component is attached to (our 3D model)
    this.sceneEl = this.el.sceneEl;
    this.canvasEl = this.sceneEl.canvas;

    console.log("manual-rotation component initialized for:", this.el.id);

    // Bind methods to ensure 'this' context is correct
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    // Listen for mousedown on the model itself (requires raycaster)
    this.modelEntity.addEventListener('mousedown', this.onMouseDown);
    
    // Listen for touchstart on the model itself
    this.modelEntity.addEventListener('touchstart', this.onTouchStart, {passive: false});
  },

  onMouseDown: function (event) {
    // event.detail.intersection will exist if raycaster hits this entity
    if (event.detail.intersection) {
      console.log("Mouse down on model", event.detail.intersection.point);
      this.isDragging = true;
      this.previousClientX = event.clientX;
      this.pauseAutoRotation();
      if (this.canvasEl) this.canvasEl.style.cursor = 'grabbing';

      // Add global listeners for mousemove and mouseup
      this.sceneEl.addEventListener('mousemove', this.onMouseMove);
      this.sceneEl.addEventListener('mouseup', this.onMouseUp);
    }
  },

  onMouseMove: function (event) {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.previousClientX;
    this.previousClientX = event.clientX;
    
    let rotation = this.modelEntity.object3D.rotation; // Get THREE.js Euler object
    // Convert deltaX to radians for THREE.js rotation
    rotation.y -= (deltaX * this.data.sensitivity * Math.PI / 180); 
    this.modelEntity.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(rotation.x),
        y: THREE.MathUtils.radToDeg(rotation.y),
        z: THREE.MathUtils.radToDeg(rotation.z)
    });
    // console.log("Model manually rotated to Y:", this.modelEntity.getAttribute('rotation').y);
  },

  onMouseUp: function () {
    if (this.isDragging) {
      console.log("Mouse up, dragging finished.");
      this.isDragging = false;
      if (this.canvasEl) this.canvasEl.style.cursor = 'grab'; // Or 'default'
      // Remove global listeners
      this.sceneEl.removeEventListener('mousemove', this.onMouseMove);
      this.sceneEl.removeEventListener('mouseup', this.onMouseUp);
      // Auto-rotation remains paused as per current requirement
    }
  },

  onTouchStart: function (event) {
    if (event.touches.length === 1) {
      // Check if the touch is on the model (assuming raycaster updates cursor for touch too)
      // A-Frame's cursor component might set this.el as the intersectedEl on touch
      // For more robust check, one might need to inspect event.detail.intersectedEl if available from AR.js interaction system
      console.log("Touch start on model candidate");
      this.isDragging = true;
      this.previousClientX = event.touches[0].clientX;
      this.pauseAutoRotation();
      event.preventDefault(); // Prevent default touch actions like scrolling

      // Add global listeners for touchmove and touchend
      this.sceneEl.addEventListener('touchmove', this.onTouchMove, {passive: false});
      this.sceneEl.addEventListener('touchend', this.onTouchEnd);
    }
  },

  onTouchMove: function (event) {
    if (!this.isDragging || event.touches.length !== 1) return;
    
    const deltaX = event.touches[0].clientX - this.previousClientX;
    this.previousClientX = event.touches[0].clientX;

    let rotation = this.modelEntity.object3D.rotation; // Get THREE.js Euler object
    rotation.y -= (deltaX * this.data.sensitivity * Math.PI / 180);
    this.modelEntity.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(rotation.x),
        y: THREE.MathUtils.radToDeg(rotation.y),
        z: THREE.MathUtils.radToDeg(rotation.z)
    });
    // console.log("Model manually rotated by touch to Y:", this.modelEntity.getAttribute('rotation').y);
    event.preventDefault(); // Prevent page scrolling
  },

  onTouchEnd: function (event) {
    // Check if it's the touch that started the drag
    if (this.isDragging && event.touches.length === 0) { // Last touch ended
      console.log("Touch end, dragging finished.");
      this.isDragging = false;
      // Remove global listeners
      this.sceneEl.removeEventListener('touchmove', this.onTouchMove);
      this.sceneEl.removeEventListener('touchend', this.onTouchEnd);
      // Auto-rotation remains paused
    }
  },

  pauseAutoRotation: function() {
    if (this.modelEntity.components['animation__autoplay']) {
      console.log("Pausing auto-rotation.");
      this.modelEntity.components['animation__autoplay'].pause();
    } else {
      console.warn("Could not find 'animation__autoplay' component to pause.");
    }
  },

  // Optional: Method to resume auto-rotation if needed later
  resumeAutoRotation: function() {
    if (this.modelEntity.components['animation__autoplay']) {
      console.log("Resuming auto-rotation.");
      this.modelEntity.components['animation__autoplay'].play();
    }
  },

  remove: function () {
    // Clean up event listeners when the component is removed
    this.modelEntity.removeEventListener('mousedown', this.onMouseDown);
    this.modelEntity.removeEventListener('touchstart', this.onTouchStart);
    this.sceneEl.removeEventListener('mousemove', this.onMouseMove);
    this.sceneEl.removeEventListener('mouseup', this.onMouseUp);
    this.sceneEl.removeEventListener('touchmove', this.onTouchMove);
    this.sceneEl.removeEventListener('touchend', this.onTouchEnd);
    if (this.canvasEl) this.canvasEl.style.cursor = 'default'; // Reset cursor
    console.log("manual-rotation component removed.");
  }
});


// Sidebar Toggle Functionality
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const animatedModel = document.getElementById('animated-model'); // Get the model entity
    const addToCartBtn = document.getElementById('addToCartBtn');
    const cartStatusDiv = document.getElementById('cartStatus');
    const cartNotification = document.getElementById('cartNotification'); // Get the notification element

    let currentSelectedDish = null;
    let cart = [];
    let notificationTimeout = null; // To manage the hide timeout

    if (!sidebar || !openSidebarBtn || !closeSidebarBtn || !animatedModel || !addToCartBtn || !cartStatusDiv || !cartNotification) {
        console.error("One or more critical UI elements (sidebar, buttons, model, cart controls, notification) not found.");
        return;
    }

    console.log("All UI elements for sidebar, cart, and notification functionality found.");

    // --- Initialize currentSelectedDish with the default loaded model/dish ---
    const defaultDishItem = sidebar.querySelector('ul li[data-model-src="assets/Bruschetta.glb"]');
    if (defaultDishItem) {
        currentSelectedDish = {
            id: defaultDishItem.dataset.dishId,
            name: defaultDishItem.dataset.dishName,
            price: parseFloat(defaultDishItem.dataset.price),
            modelSrc: defaultDishItem.dataset.modelSrc
        };
        console.log("Default dish pre-selected:", currentSelectedDish.name);
    } else {
        console.warn("Could not pre-select the default dish. Ensure the Bruschetta item exists in HTML with correct data attributes.");
    }

    // --- Model Event Handling ---
    animatedModel.addEventListener('model-loaded', () => {
        console.log("New 3D Model successfully loaded:", animatedModel.getAttribute('gltf-model'));
        if (addToCartBtn) addToCartBtn.disabled = false; // Enable button
        
        // Ensure animation component is active and plays
        if (animatedModel.components['animation__autoplay']) {
            animatedModel.components['animation__autoplay'].play(); // Restart animation for new model
        }
        // Reset manual rotation state if necessary (or let it persist)
        // For now, rotation state will persist based on manual-rotation component
        console.log("Model ready for interaction.");
    });

    animatedModel.addEventListener('model-error', (event) => {
        console.error("Error loading 3D Model:", event.detail.src);
        if (addToCartBtn) addToCartBtn.disabled = true; // Disable button on error
        currentSelectedDish = null; // Clear selection
        // Optionally, display an error message to the user
    });


    // --- Sidebar Toggle Logic ---
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (openSidebarBtn) openSidebarBtn.style.display = 'none';
        console.log("Sidebar opened.");
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (openSidebarBtn) openSidebarBtn.style.display = 'block';
        console.log("Sidebar closed.");
    }

    openSidebarBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    // closeSidebar(); // Initial state - will be called after potential default selection

    // --- Dish Selection Logic ---
    const dishItems = sidebar.querySelectorAll('ul li');
    dishItems.forEach(item => {
        item.addEventListener('click', () => {
            const modelSrc = item.dataset.modelSrc;
            const dishId = item.dataset.dishId;
            const dishName = item.dataset.dishName;
            const dishPrice = parseFloat(item.dataset.price);

            if (!modelSrc) {
                console.error("No model source defined for this dish item.");
                return;
            }

            console.log(`Dish selected: ${dishName}, Model: ${modelSrc}, Price: ${dishPrice}`);
            
            currentSelectedDish = { id: dishId, name: dishName, price: dishPrice, modelSrc: modelSrc };
            
            if (addToCartBtn) addToCartBtn.disabled = true; // Disable while model loads

            animatedModel.setAttribute('gltf-model', modelSrc);
            
            // Adjust scale based on model - this is a placeholder, specific scales might be needed
            // For simplicity, we'll use a default scale for now, but this could be a data-attribute too.
            // Example: animatedModel.setAttribute('scale', item.dataset.modelScale || "0.01 0.01 0.01");
            // For now, keeping the default scale from HTML, assuming models are somewhat normalized or this is handled later.

            // Ensure manual-rotation component is aware of potential model change if it needs re-initialization (usually not for attribute changes)
            // The animation component should restart due to startEvents: model-loaded (if not, we might need to manually play)

            closeSidebar(); // Close sidebar after selection
        });
    });

    // --- Cart Functionality ---
    function updateCartDisplay() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartStatusDiv.textContent = `Cart: ${totalItems} item(s) - $${totalPrice.toFixed(2)}`;
        console.log("Cart updated:", cart);
    }

    addToCartBtn.addEventListener('click', () => {
        if (!currentSelectedDish) {
            alert("Please select a dish first!");
            return;
        }
        if (addToCartBtn.disabled) {
            alert("Please wait for the model to load.");
            return;
        }

        const existingItemIndex = cart.findIndex(item => item.id === currentSelectedDish.id);
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push({ 
                id: currentSelectedDish.id, 
                name: currentSelectedDish.name, 
                price: currentSelectedDish.price, 
                quantity: 1 
            });
        }
        
        console.log(`${currentSelectedDish.name} added to cart.`);
        // alert(`${currentSelectedDish.name} added to cart!`); // Replaced with custom notification
        showCartNotification(`${currentSelectedDish.name} added!`);
        updateCartDisplay();
    });

    function showCartNotification(message) {
        if (notificationTimeout) {
            clearTimeout(notificationTimeout); // Clear existing timeout if any
        }
        cartNotification.textContent = message;
        cartNotification.classList.add('show');
        notificationTimeout = setTimeout(() => {
            cartNotification.classList.remove('show');
        }, 2500); // Hide after 2.5 seconds
    }

    // Initialize cart display
    updateCartDisplay();
    
    // Ensure sidebar is closed initially after all setup
    closeSidebar(); 

});

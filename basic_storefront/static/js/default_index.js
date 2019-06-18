// This is the js for the default/index.html view.

var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) { var k=0; return v.map(function(e) {e._idx = k++;});};

    self.do_search = function(){
        /*
        partial pass to server method

        $.getJSON(search_url,
            {search_string: self.vue.search_string,},
            function(data){
                self.vue.strings = data.strings
            })
        */
        if(self.vue.search_string != ''){
            self.vue.product_list_display = [];
            for(var i = 0; i < self.vue.product_list.length; ++i){
                if(self.vue.product_list[i].product_name.startsWith(self.vue.search_string)){
                    self.vue.product_list_display.push(self.vue.product_list[i])
                }
            }
        }else{
            self.vue.product_list_display = self.vue.product_list;
        }        
    }

    self.get_products = function() {
        $.getJSON(get_product_list_url,
            function(data) {
                self.vue.product_list = data.product_list;
                self.process_product_list();
                self.vue.product_list_display = data.product_list;
            });
    }

    self.process_product_list = function() {
        // This function is used to post-process products, after the list has been modified
        // or after we have gotten new products. 
        // We add the _idx attribute to the products. 
        enumerate(self.vue.product_list);

        self.vue.product_list.map(function(e){
            /*
                Change later lol.
                must use Vue.set() or else Vue can't see it here?
                    no 'e._smile = e.like;', else it cannot be
                    accessed?
                Arrays should always be manipulated liket this?
                    seems to work anyways.
            */
            Vue.set(e, '_num_stars_display', e.rating);
            Vue.set(e, '_star_rating', 0);
            Vue.set(e, '_review_display', false);
            Vue.set(e, '_user_review', []);
            Vue.set(e, '_review_content', '');
            Vue.set(e, '_review_list', []);
            Vue.set(e, '_union', []);
        })
    }

    // cursor is outside of div containing ratings
    self.stars_out = function(product_idx){
        var p = self.vue.product_list[product_idx];
        // original
        // p._num_stars_display = p.rating;
        if(p._star_record == null){
            if(p._star_temp != null){
                p._star_rating = p._star_temp;
            }else{
                p._star_rating = 0;
            }
        }else{
            p._star_rating = p._star_record.star_rating;
        }
    }

    // Hovering over a star; we show that as the number of active stars.
    self.stars_over = function(product_idx, star_idx) {
        var p = self.vue.product_list[product_idx];
        // original
        // p._num_stars_display = p.rating;
        p._star_rating = star_idx;
    };

    // div containing ratings is clicked on
    self.set_stars = function(product_idx, star_idx){
        var p = self.vue.product_list[product_idx];
        p._star_rating = star_idx;
        try{
            p._star_record.star_rating = star_idx;
        }catch{
            console.log('warning: set_star() null star record')
            p._star_temp = star_idx;
        }
        

        $.post(set_stars_url, {
            star_prod_id: p.id,
            star_rating: star_idx
        });
    }

    self.review_open = function(product_idx){
        var p = self.vue.product_list[product_idx];
        
        $.getJSON(get_reviews_url, {product_id: p.id},
            function(data) {
                p._user_review = data.user_review;
                p._star_record = data.star_record;
                p._review_list = data.review_list;
                p._star_records = data.star_records;
                p._union = data.union
                

                // attempt at error-catching-boilerplate-methods below.
                //   try-catch when things turn out null
                try{
                    p._star_rating = p._star_record.star_rating;
                }catch{
                    p._star_rating = 0;
                }
                
                try{
                    p._review_content = p._user_review[0].review_content;
                }catch(e){
                    p._review_content = '';
                }
                
                // need to be inside getJSON else race conditions?
                p._review_display = true;
            });
        
        
    }

    self.review_collapse = function(product_idx){
        var p = self.vue.product_list[product_idx];
        p._review_display = false;
    }



    self.review_submit = function(product_idx){
        var p = self.vue.product_list[product_idx];
        var r_content = document.getElementById("user_review_content").value;
        self.vue.show_checkmark = true;

        $.post(set_review_url, {
                product_id: p.id,
                review_content: r_content,
            },
            // re-enable after post request finishes
            setTimeout(
                function(){
                    self.vue.show_checkmark = false;
                    console.log('here');
                },
                2000
            )
        );
    }

    self.cart_get = function() {
        $.getJSON(cart_get_url,
            function(data) {
                self.vue.cart = data.cart_list;
                self.vue.cart_size = self.vue.cart.length;
            });    
    };


    self.cart_inc_quantity = function(product_idx, qty) {
        // Inc and dec to desired quantity.
        var p = self.vue.cart[product_idx];
        p.cart_quantity = Math.max(0, p.cart_quantity + qty);
        p.cart_quantity = Math.min(p.product_quantity, p.cart_quantity);
        self.cart_store(p);
    };

    self.cart_store = function(product) {
        $.post(cart_inc_url, 
            {
                product_id: product.id,
                cart_amount: product.desired_quantity,
            },
        );
    }; 

    self.cart_purchase = function(cart) {
        $.post(cart_clear_url, 
            {
                cart: cart,
            }
        );
        
        while(cart.length > 0){
            cart.pop();
        }
        self.vue.cart_size = 0;
        self.goto('prod');
    }

    self.buy_inc_quantity = function(product_idx, qty) {
        // Inc and dec to desired quantity.
        var p = self.vue.product_list[product_idx];
        p.desired_quantity = Math.max(0, p.desired_quantity + qty);
        p.desired_quantity = Math.min(p.product_quantity, p.desired_quantity);
    };

    self.buy_product = function(product_idx) {
        var p = self.vue.product_list[product_idx];
        
        // I need to put the product in the cart.
        // Check if it is already there.
        var already_present = false;
        var found_idx = 0;
        for (var i = 0; i < self.vue.cart.length; i++) {
            if (self.vue.cart[i].cart_prod_id === p.id) {
                console.log('hey found it')
                console.log("we're matching this ")
                console.log(self.vue.cart[i].cart_prod_id)
                console.log(" with that ")
                console.log(p.id)
                already_present = true;
                found_idx = i;
            }
        }

        // If it's there, just replace the quantity; otherwise, insert it.
        if (!already_present) {
            found_idx = self.vue.cart.length;
            self.vue.cart.push({
                cart_prod_id: p.id,
                cart_amount: p.desired_quantity,
                cart_prod_name: p.product_name,
            });
            self.vue.cart_size++;
            self.vue.cart_total++;
            console.log('new');
        }

        self.vue.cart[found_idx].cart_amount = p.desired_quantity;        
        console.log(self.vue.cart);
        // Updates the amount of products in the cart.
        self.cart_store(p);
    };

    

    self.goto = function (page) {
        self.vue.page = page;
        /* 
        // the following requires the stripe api

        if (page == 'cart') {
            // prepares the form.
            self.stripe_instance = StripeCheckout.configure({
                key: '',    //put your own publishable key here
                image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
                locale: 'auto',
                token: function(token, args) {
                    console.log('got a token. sending data to localhost.');
                    self.stripe_token = token;
                    self.customer_info = args;
                    self.send_data_to_server();
                }
            });
        };          */
    };


    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            // search variables...?
            search_string: '',

            // product list variables
            product_list: [],             // True copy, manipulate this
            product_list_display: [],     // shallow copy that gets manipulated to display
                                          //   correct products when searching

            // star varaibles, to handle which index is being shown
            star_indices: [1, 2, 3, 4, 5],

            // extraneous
            show_checkmark: false,        // confirm submission for better ux
            page: 'prod',                 // toggle whether shopping cart
                                          //    or product list is displayed      

            // shopping cart variables
            cart: [],
            cart_size: 0,                   // number of different items in cart
            cart_total: 0,                  // total price of all items with their quantities

        },
        methods: {
            // dynamic search
            do_search: self.do_search,

            // insert/view star rating methods
            stars_out: self.stars_out,            
            stars_over: self.stars_over,
            set_stars: self.set_stars,

            // create/view review methods
            review_open: self.review_open,
            review_collapse: self.review_collapse,
            review_submit: self.review_submit,

            // buying products methods
            buy_inc_quantity: self.buy_inc_quantity,
            buy_product: self.buy_product,

            // manipulate/view cart methods
            cart_get: self.cart_get,
            cart_inc_quantity: self.cart_inc_quantity,
            cart_store: self.cart_store,
            cart_purchase: self.cart_purchase,



            // extraneous
            goto: self.goto,          

        }

    });

    self.get_products();
    self.cart_get();
    $("#vue-div").show();

    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});

'''
    Note, when printing the resulting list created by appending
      records found by a query to it, there is some sort of race
      between the printing operation and appending. Ocassionally
      the browser console will throw an error. Not a major issue,
      but be sure to remove any prints after testing, else a user
      will ocassionally run into this error.
'''


# Here go your api methods.

def get_product_list():
    results = []
    
    #if auth.user is not None:
    rows = db().select(db.product_table.ALL,
                orderby=~db.product_table.product_time)

    for row in rows:
        star_records = db(db.star_table.star_prod_id == row.id).select(db.star_table.star_rating)
        avg_stars = 0
        row.desired_quantity = min(1, row.product_quantity)
        if star_records is not None:
            index = 0
            for record in star_records:
                avg_stars += record.star_rating
                index = index + 1
            if index != 0:
                avg_stars = avg_stars / index

        results.append(dict(
            id=row.id,
            product_name=row.product_name,
            product_desc=row.product_desc,
            product_price=row.product_price,
            product_quantity=row.product_quantity,
            desired_quantity=row.desired_quantity,
            cart_quantity=0,
            product_email=row.product_email,
            rating=avg_stars,
        ))
    return response.json(dict(product_list=results))

def set_stars():
    # insert a star record into the table referencing its respective product
    product_id = int(request.vars.star_prod_id)
    rating = int(request.vars.star_rating)

    db.star_table.update_or_insert(
        (db.star_table.star_prod_id == product_id) & (db.star_table.star_user_email == auth.user.email),
        star_prod_id = product_id,
        star_user_email = auth.user.email,
        star_rating = rating,
    )

def get_reviews():
    product_id = int(request.vars.product_id)
    union = []
    
    if auth.user is not None: 
        email = auth.user.email
        # what's better, 1 query then loop to identity user record?
        #     or two queries?
        # need to look over db.table.on functionality to make a simpler
        #     query. 
        user_record = db((db.review_table.review_prod_id == product_id) & (db.review_table.review_user_email == email)).select()
        reviews_records = db((db.review_table.review_prod_id == product_id) & (db.review_table.review_user_email != email)).select()

        # don't know how to work with union operations to join, star records with reviews....
        # example from Luca doesn't seem to work 
        star_record = db((db.star_table.star_prod_id == product_id) & (db.star_table.star_user_email == email)).select().first()
        star_records = db((db.star_table.star_prod_id == product_id) & (db.star_table.star_user_email != email)).select()
    else:
        user_record = ''
        reviews_records = db(db.review_table.review_prod_id == product_id).select()
        star_record = 0
        star_records = db(db.star_table.star_prod_id == product_id).select()

    # boiler plate method since left union join isn't working
    # we assume that we only show reviews when a text
    #   review is avaialabe for a user. star rating is either
    #   equal to a rating that they've already existed or displayed 
    #   as 0 in javascript
    for review in reviews_records:
        star_rating = 0

        for star in star_records:
            if((review.review_prod_id == star.star_prod_id) and (review.review_user_email == star.star_user_email)):
                star_rating = star.star_rating
                print star_rating
                break
        
        union.append(dict(
            review_content=review.review_content,
            review_user_email=review.review_user_email,
            star_rating=star_rating,
        ))

    return response.json(dict(user_review = user_record,
                            star_record = star_record,
                            review_list = reviews_records,
                            star_records = star_records,
                            union = union))


@auth.requires_signature(hash_vars=False)
def set_review():
    # insert a review record into the table referencing its respective product
    product_id = int(request.vars.product_id)
    review_content = str(request.vars.review_content)

    db.review_table.update_or_insert(
        (db.review_table.review_prod_id == product_id) & (db.review_table.review_user_email == auth.user.email),
        review_prod_id = product_id,
        review_user_email = auth.user.email,
        review_content = review_content,
    )



'''
    #cart methods
'''
# get the list of products in the shopping cart with their quantities
def cart_get():
    results = []

    # If a user is not logged in, they cannot add to or open the 
    #   shopping cart. handled in index.html
    if auth.user is not None:
        rows = db(db.shopping_cart.cart_user_email == auth.user.email).select()
        for row in rows:

            prod_name = db(db.product_table.id == row.cart_prod_id).select(db.product_table.product_name).first()
            results.append(dict(
                cart_user_email=row.cart_user_email,
                cart_prod_id=row.cart_prod_id,
                cart_prod_name=prod_name.product_name,
                cart_amount=row.cart_amount,
            ))

    return response.json(dict(cart_list=results))

# adds the specified quantity of the specified product to
#   the cart. (if the product is already in the cart the,
#   quantity on order is incremented)
def cart_inc():
    cart_prod_id = request.vars.product_id
    cart_amount = request.vars.cart_amount
    
    db.shopping_cart.update_or_insert(
        (db.shopping_cart.cart_prod_id == cart_prod_id) & (db.shopping_cart.cart_user_email == auth.user.email),
        cart_user_email = auth.user.email,
        cart_prod_id = cart_prod_id,
        cart_amount = cart_amount,
    )





# clears the shopping cart
def cart_clear():
    print 'blah'
    db(db.shopping_cart.cart_user_email == auth.user.email).delete()

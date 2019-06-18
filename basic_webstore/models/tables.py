# Define your tables below (or better in another model file) for example
#
# >>> db.define_table('mytable', Field('myfield', 'string'))
#
# Fields can be 'string','text','password','integer','double','boolean'
#       'date','time','datetime','blob','upload', 'reference TABLENAME'
# There is an implicit 'id integer autoincrement' field
# Consult manual for more options, validators, etc.

import datetime

def get_user_email():
    return None if auth.user is None else auth.user.email

def get_current_time():
    return datetime.datetime.utcnow()

db.define_table('product_table',
            Field('product_name', 'string'),
            Field('product_desc', 'text'),
            Field('product_price', 'double'),
            Field('product_quantity', 'integer'),
            Field('product_email', default=get_user_email()),
            Field('product_time', 'datetime', default=get_current_time()),
)

db.define_table('star_table',
            Field('star_user_email'),
            Field('star_prod_id', 'reference product_table'),
            Field('star_rating', 'integer', default = None),
)

db.define_table('review_table',
            Field('review_user_email'),
            Field('review_prod_id', 'reference product_table'),
            Field('review_content', 'text'),
)

db.define_table('shopping_cart',
            Field('cart_user_email'),
            Field('cart_prod_id', 'reference product_table'),
            Field('cart_amount', 'integer')

)

db.product_table.product_email.readable = False 
db.product_table.product_time.readable = False
db.product_table.product_email.writable = False 
db.product_table.product_time.writable = False

db.product_table.product_name.requires = IS_NOT_EMPTY(error_message='Field can not be empty')
db.product_table.product_desc.requires = IS_NOT_EMPTY(error_message='Field can not be empty')
db.product_table.product_price.requires = IS_FLOAT_IN_RANGE(1, 1e10,
                                                    error_message='Usage: double in range [1, 1e10]')
db.product_table.product_quantity.requires = IS_INT_IN_RANGE(1, 1e10,
                                                    error_message='Usage: integer in range [1, 1e10)')

# money regex, need way to just limit input. IS_MATCH only checks after the form is
#   submitted. after pressing submit, it crashes the page
# db.product_table.product_price.requires = IS_MATCH('^[0-9]+(\.[0-9]{1,2})?$',
            # error_message='Usage: ^[0-9]+(\.[0-9]{1,2})?$')


# after defining tables, uncomment below to enable auditing
# auth.enable_record_versioning(db)

def test_filtering_logic():
    products = [
        {"name": "Men's Shirt", "category": "men"},
        {"name": "Women's Dress", "category": "women"},
        {"name": "Kid's Toy", "category": "kids"},
        {"name": "Unisex Hat", "category": "accessories"}
    ]

    category_to_filter = "men"
    category_lower = category_to_filter.lower()

    print(f"Filtering for category: '{category_to_filter}'")
    
    # Old logic (simulated)
    print("\nOld Logic Results:")
    for p in products:
        prod_cat = p["category"].lower()
        if prod_cat == category_lower or prod_cat in category_lower or category_lower in prod_cat:
             print(f"  MATCH: {p['name']} ({p['category']})")
        else:
             print(f"  NO MATCH: {p['name']} ({p['category']})")

    # New logic
    print("\nNew Logic Results:")
    for p in products:
        prod_cat = p["category"].lower()
        if prod_cat == category_lower:
             print(f"  MATCH: {p['name']} ({p['category']})")
        else:
             print(f"  NO MATCH: {p['name']} ({p['category']})")

if __name__ == "__main__":
    test_filtering_logic()

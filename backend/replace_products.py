"""
Replace all products: Clear old products and import new ones from SHEIN CSV
"""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from clear_products import clear_all_products
from import_shein_products import import_shein_products_from_csv


def replace_products():
    """Clear old products and import new ones from SHEIN CSV"""
    print("=" * 60)
    print("REPLACE PRODUCTS - Clear Old & Import New")
    print("=" * 60)
    print()
    
    # Step 1: Clear old products
    print("Step 1: Clearing old products...")
    print("-" * 60)
    try:
        clear_all_products()
        print()
    except Exception as e:
        print(f"Error clearing products: {e}")
        return
    
    # Step 2: Import new products
    print("Step 2: Importing new products from SHEIN CSV...")
    print("-" * 60)
    
    # Get CSV file path (prefer filtered version if available)
    current_dir = Path(__file__).parent
    csv_paths = [
        current_dir.parent / "shein-products_filtered.csv",  # Prefer filtered version
        current_dir / "shein-products_filtered.csv",
        current_dir.parent / "shein-products.csv",
        current_dir / "shein-products.csv",
        Path("shein-products_filtered.csv"),
        Path("shein-products.csv"),
    ]
    
    csv_path = None
    for path in csv_paths:
        if path.exists():
            csv_path = str(path)
            break
    
    if not csv_path:
        print("Error: Could not find 'shein-products.csv' or 'shein-products_filtered.csv' file")
        print("Please ensure the CSV file is in the project root or backend directory")
        print("\nTip: Run 'python filter_shein_products.py' first to filter the CSV")
        return
    
    if "filtered" in csv_path:
        print("(Using filtered CSV - only clothing and jewelry products)")
    
    try:
        import_shein_products_from_csv(csv_path)
        print()
        print("=" * 60)
        print("✓ Product replacement complete!")
        print("=" * 60)
    except Exception as e:
        print(f"Error importing products: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    print()
    print("⚠ WARNING: This will delete ALL existing products and import new ones")
    print("   The script will use 'shein-products_filtered.csv' if available,")
    print("   otherwise it will use 'shein-products.csv'")
    print()
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        replace_products()
    else:
        print("Operation cancelled.")


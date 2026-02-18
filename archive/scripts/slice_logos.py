from PIL import Image
import os

def slice_logos():
    try:
        # Load the image
        img_path = r'public/logos/original.png'
        if not os.path.exists(img_path):
            print(f"Error: {img_path} not found.")
            return

        img = Image.open(img_path)
        width, height = img.size
        
        # Grid parameters (assuming 3x3 grid based on standard generation outputs)
        cols = 3
        rows = 3
        
        step_x = width // cols
        step_y = height // rows
        
        print(f"Image size: {width}x{height}")
        print(f"Slicing into {cols}x{rows} grid...")

        count = 0
        for r in range(rows):
            for c in range(cols):
                left = c * step_x
                top = r * step_y
                right = left + step_x
                bottom = top + step_y
                
                # Crop logic
                # Add a small margin to crop cleaner if needed? No, standard 3x3 usually abuts.
                # However, generation grids sometimes have white padding.
                # Let's crop centered 90% to avoid edges if possible, or just exact grid.
                # For now, exact grid is safer for capturing everything.
                
                logo_crop = img.crop((left, top, right, bottom))
                
                count += 1
                out_filename = f'public/logos/logo_ref_{count}.png'
                logo_crop.save(out_filename)
                print(f"Saved {out_filename}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    slice_logos()

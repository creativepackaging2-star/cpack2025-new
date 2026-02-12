from PIL import Image
import os

def crop_text():
    try:
        input_path = r'public/logos/logo_ref_3.png'
        output_path = r'public/logos/logo_ref_3_cropped.png'
        
        if not os.path.exists(input_path):
            print(f"Error: {input_path} not found.")
            return

        img = Image.open(input_path)
        width, height = img.size
        
        # Assumption: Text is at the bottom. Crop to keep top 75%
        new_height = int(height * 0.75)
        
        cropped_img = img.crop((0, 0, width, new_height))
        
        # Determine content bounding box to trim whitespace
        bbox = cropped_img.getbbox()
        if bbox:
            cropped_img = cropped_img.crop(bbox)
        
        cropped_img.save(output_path)
        print(f"Saved {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    crop_text()

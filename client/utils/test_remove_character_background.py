import importlib.util
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


SCRIPT_PATH = Path(__file__).with_name("remove_character_background.py")


def load_script():
    assert SCRIPT_PATH.exists(), "remove_character_background.py should exist"
    spec = importlib.util.spec_from_file_location("remove_character_background", SCRIPT_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_frame(path: Path):
    image = Image.new("RGB", (64, 64), (250, 250, 250))
    draw = ImageDraw.Draw(image)
    draw.rectangle((20, 14, 44, 50), fill=(20, 20, 20))
    draw.rectangle((29, 27, 35, 33), fill=(255, 255, 255))
    image.save(path)


class RemoveCharacterBackgroundTest(unittest.TestCase):
    def test_clean_image_removes_edge_connected_background_and_keeps_white_details(self):
        module = load_script()

        with self.subTest("single frame"):
            tmp = Path(self._testMethodName)
            tmp.mkdir(exist_ok=True)
            try:
                source = tmp / "frame.png"
                output = tmp / "clean.png"
                make_frame(source)

                module.clean_image(source, output, size=128, threshold=245, padding=4)

                clean = Image.open(output)
                self.assertEqual(clean.size, (128, 128))
                self.assertEqual(clean.mode, "RGBA")
                self.assertEqual(clean.getpixel((0, 0))[3], 0)

                alpha_box = clean.getchannel("A").getbbox()
                self.assertIsNotNone(alpha_box)

                opaque_white_pixels = 0
                for red, green, blue, alpha in clean.get_flattened_data():
                    if alpha > 200 and red > 240 and green > 240 and blue > 240:
                        opaque_white_pixels += 1
                self.assertGreater(opaque_white_pixels, 0)
            finally:
                for child in tmp.glob("*"):
                    child.unlink()
                tmp.rmdir()

    def test_process_directory_preserves_animation_folders_and_file_names(self):
        module = load_script()

        tmp = Path(self._testMethodName)
        source_root = tmp / "chracter"
        output_root = tmp / "chracter_clean"
        try:
            for folder_name in ("idle", "move_right"):
                folder = source_root / folder_name
                folder.mkdir(parents=True, exist_ok=True)
                make_frame(folder / "frame.png")

            written = module.process_directory(source_root, output_root, size=128, threshold=245, padding=4)

            self.assertEqual(written, 2)
            for folder_name in ("idle", "move_right"):
                output = output_root / folder_name / "frame.png"
                self.assertTrue(output.exists())
                with Image.open(output) as image:
                    self.assertEqual(image.size, (128, 128))
                    self.assertEqual(image.mode, "RGBA")
        finally:
            if tmp.exists():
                for path in sorted(tmp.rglob("*"), reverse=True):
                    if path.is_file():
                        path.unlink()
                    else:
                        path.rmdir()
                tmp.rmdir()


if __name__ == "__main__":
    unittest.main()

import unittest

from greet import greet


class TestGreet(unittest.TestCase):
    def test_greet_basic(self):
        self.assertEqual(greet("World"), "Hello, World!")

    def test_greet_empty_name(self):
        self.assertEqual(greet(""), "Hello, !")


if __name__ == "__main__":
    unittest.main()

import unittest

from greet import greet


class TestGreet(unittest.TestCase):
    def test_greet_basic(self):
        self.assertEqual(greet("World"), "Hello, World!")


if __name__ == "__main__":
    unittest.main()

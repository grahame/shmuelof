#!/usr/bin/env python3

import json
from urllib.parse import quote as uq


def main():
    urls = []

    def make_url(category, book_num, book, chapter):
        return "https://raw.githubusercontent.com/grahame/Schmueloff---{}/master/{}/{}".format(
            uq(category),
            uq('{:02} {}'.format(book_num, book)),
            uq('{} {:02}.mp3'.format(book, chapter)))

    def add_urls(category, book_num, book, chapters):
        for i in range(1, chapters + 1):
            urls.append(make_url(category, book_num, book, i))

    def add_category(category, *books):
        for book_num, (book, chapters) in enumerate(books, 1):
            add_urls(category, book_num, book, chapters)

    add_category(
        'Torah',
        ('Genesis', 50),
        ('Exodus', 40),
        ('Leviticus', 27),
        ('Numbers', 36),
        ('Deuteronomy', 34))

    add_category(
        'Prophets',
        ('Joshua', 24),
        ('Judges', 21),
        ('1 Samuel', 31),
        ('2 Samuel', 24),
        ('1 Kings', 22),
        ('2 Kings', 25),
        ('Isaiah', 66),
        ('Jeremiah', 52),
        ('Ezekiel', 48),
        ('Hosea', 14),
        ('Joel', 4),
        ('Amos', 9),
        ('Obadiah', 1),
        ('Jonah', 4),
        ('Micah', 7),
        ('Nahum', 3),
        ('Habakkuk', 3),
        ('Zephaniah', 3),
        ('Haggai', 2),
        ('Zechariah', 14),
        ('Malachi', 3),
    )

    add_category(
        'Writings',
        ('1 Chronicles', 29),
        ('2 Chronicles', 36),
        ('Psalms', 150),
        ('Job', 42),
        ('Proverbs', 31),
        ('Ruth', 4),
        ('Song of Songs', 8),
        ('Ecclesiastes', 12),
        ('Lamentations', 5),
        ('Esther', 10),
        ('Daniel', 12),
        ('Ezra', 10),
        ('Nehemiah', 13),
    )

    import requests
    with open('src/urls.json', 'w') as fd:
        json.dump({'urls': urls}, fd)

    s = requests.Session()
    for url in urls:
        resp = s.head(url)
        print(url)
        assert(resp.status_code == 200)

    print(len(urls))


if __name__ == '__main__':
    main()

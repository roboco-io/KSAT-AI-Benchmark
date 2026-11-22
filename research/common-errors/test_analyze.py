import unittest

from analyze import answer, correct, load, metrics, vote


class ScoringTests(unittest.TestCase):
    def test_official_does_not_inherit_adjusted_status(self):
        q = {'status': 'correct', 'answer': 4, 'correct_answer': 5,
             'accepted_answers': [4, 5], 'points': 3}
        self.assertFalse(correct(answer(q), q, 'official'))
        self.assertTrue(correct(answer(q), q, 'adjusted'))

    def test_failed_output_and_abstention_never_vote(self):
        for status in ('error', 'pending', 'abstained'):
            self.assertIsNone(answer({'status': status, 'answer': 3}))

    def test_tie_and_all_abstain(self):
        self.assertIsNone(vote([1, 2, None]))
        self.assertIsNone(vote([None, None]))

    def test_plurality_is_not_strict_majority(self):
        self.assertEqual(vote([1, 1, 2, 3, None]), 1)
        self.assertIsNone(vote([1, 1, 2, 3, None], strict=True))
        self.assertEqual(vote([1, 1, 1, 3, None], strict=True), 1)

    def test_no_decision_remains_in_denominator(self):
        qs = [{'correct_answer': 1, 'points': 2}, {'correct_answer': 2, 'points': 3}]
        m = metrics([1, None], qs, 'official')
        self.assertEqual((m['accuracy'], m['no_decision'], m['points'], m['max_points']), (.5, 1, 2, 5))

    def test_frozen_data_matches_exported_scores(self):
        for year in (2025, 2026):
            _, models = load(year)
            for name, model in models.items():
                pred = [answer(q) for q in model['qs']]
                expected = model.get('official_summary', model['summary'])['correct']
                self.assertEqual(metrics(pred, model['qs'], 'official')['correct'], expected, (year, name))
                self.assertEqual(metrics(pred, model['qs'], 'adjusted')['correct'], model['summary']['correct'])


if __name__ == '__main__':
    unittest.main()
